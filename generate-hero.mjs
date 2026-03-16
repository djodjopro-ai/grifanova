import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load API key
const env = (await readFile(join(__dirname, '.env'), 'utf8'))
  .split('\n')
  .reduce((acc, line) => {
    const [k, ...v] = line.split('=');
    if (k && v.length) acc[k.trim()] = v.join('=').trim();
    return acc;
  }, {});

const API_KEY = env.KIE_API_KEY;
const BASE = 'https://api.kie.ai/api/v1';

// ── Step 1: Generate hero image via Nano Banana Pro ──
// Prompt crafted to match Grifa's aesthetic: modern minimalist interiors, warm wood, dark surfaces
const heroPrompt = `A breathtaking ultra-wide cinematic photograph of a luxurious modern kitchen interior. Rich warm walnut wood cabinetry with handleless design, matte black granite countertops, integrated LED under-cabinet lighting creating a warm amber glow. The kitchen features a large island with a waterfall edge countertop. Soft natural light streams through floor-to-ceiling windows on the left. The space has clean minimalist lines, warm neutral tones of oak, charcoal, and cream. Professional architectural photography, shallow depth of field, golden hour lighting, 8K resolution, photorealistic. No people, no text, no watermarks.`;

async function createImageTask(prompt, aspectRatio = '16:9') {
  const res = await fetch(`${BASE}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'nano-banana-pro',
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        resolution: '2K',
        output_format: 'jpg',
      },
    }),
  });
  const data = await res.json();
  console.log('Image task created:', JSON.stringify(data, null, 2));
  return data?.data?.taskId;
}

async function pollTask(taskId, label = '') {
  const prefix = label ? `[${label}] ` : '';
  console.log(`${prefix}Polling task ${taskId}...`);

  while (true) {
    const res = await fetch(`${BASE}/jobs/recordInfo?taskId=${taskId}`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
    });
    const data = await res.json();
    const state = data?.data?.state;

    console.log(`${prefix}State: ${state}`);

    if (state === 'success') {
      const resultJson = JSON.parse(data.data.resultJson);
      console.log(`${prefix}Result:`, JSON.stringify(resultJson, null, 2));
      return resultJson;
    }

    if (state === 'fail') {
      console.error(`${prefix}FAILED:`, data.data.failMsg);
      return null;
    }

    // Wait 10 seconds before polling again
    await new Promise(r => setTimeout(r, 10000));
  }
}

async function downloadFile(url, outputPath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  const { writeFile } = await import('node:fs/promises');
  await writeFile(outputPath, buffer);
  console.log(`Downloaded: ${outputPath} (${(buffer.length / 1024).toFixed(0)}KB)`);
  return outputPath;
}

async function run() {
  console.log('=== Step 1: Generating hero image via Nano Banana Pro ===\n');

  const imageTaskId = await createImageTask(heroPrompt, '16:9');
  if (!imageTaskId) {
    console.error('Failed to create image task');
    process.exit(1);
  }

  const imageResult = await pollTask(imageTaskId, 'IMAGE');
  if (!imageResult) {
    console.error('Image generation failed');
    process.exit(1);
  }

  // Download the generated image
  const imageUrl = imageResult.resultUrls?.[0];
  if (!imageUrl) {
    console.error('No image URL in result');
    process.exit(1);
  }

  const posterPath = join(__dirname, 'images', 'hero-poster.jpg');
  await downloadFile(imageUrl, posterPath);

  console.log('\n=== Step 2: Generating hero video via Kling 3.0 ===\n');

  // Use the generated image as the start frame for video
  const videoPrompt = 'Slow cinematic camera dolly forward through the luxurious modern kitchen. Subtle light rays shift through the windows. Smooth ambient lighting transitions. Very slow, elegant camera movement. Professional architectural video. No people.';

  const videoRes = await fetch(`${BASE}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kling-3.0/video',
      input: {
        prompt: videoPrompt,
        image_urls: [imageUrl],
        sound: false,
        duration: '5',
        aspect_ratio: '16:9',
        mode: 'pro',
        multi_shots: false,
      },
    }),
  });

  const videoData = await videoRes.json();
  console.log('Video task created:', JSON.stringify(videoData, null, 2));

  const videoTaskId = videoData?.data?.taskId;
  if (!videoTaskId) {
    console.error('Failed to create video task');
    process.exit(1);
  }

  const videoResult = await pollTask(videoTaskId, 'VIDEO');
  if (!videoResult) {
    console.error('Video generation failed');
    process.exit(1);
  }

  const videoUrl = videoResult.resultUrls?.[0];
  if (!videoUrl) {
    console.error('No video URL in result');
    process.exit(1);
  }

  const videoPath = join(__dirname, 'images', 'hero-video.mp4');
  await downloadFile(videoUrl, videoPath);

  console.log('\n=== DONE ===');
  console.log(`Hero poster: ${posterPath}`);
  console.log(`Hero video: ${videoPath}`);
}

run().catch(console.error);
