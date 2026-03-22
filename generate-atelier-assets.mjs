import { readFile, writeFile } from 'node:fs/promises';
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

async function createImageTask(prompt, aspectRatio = '1:1') {
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
  return data?.data?.taskId;
}

async function createVideoTask(imageUrl, prompt) {
  const res = await fetch(`${BASE}/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'kling-3.0/video',
      input: {
        prompt,
        image_urls: [imageUrl],
        sound: false,
        duration: '5',
        aspect_ratio: '16:9',
        mode: 'pro',
        multi_shots: false,
      },
    }),
  });
  const data = await res.json();
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
      return resultJson;
    }
    if (state === 'fail') {
      console.error(`${prefix}FAILED:`, data.data.failMsg);
      return null;
    }
    await new Promise(r => setTimeout(r, 10000));
  }
}

async function downloadAndOptimize(url, outputPath, maxWidth = 1920) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());

  // Optimize with sharp
  const sharp = (await import('sharp')).default;
  await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toFile(outputPath);

  const { statSync } = await import('node:fs');
  const size = statSync(outputPath).size;
  console.log(`Saved: ${outputPath} (${(size / 1024).toFixed(0)}KB)`);
}

async function downloadRaw(url, outputPath) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(outputPath, buffer);
  const { statSync } = await import('node:fs');
  const size = statSync(outputPath).size;
  console.log(`Saved: ${outputPath} (${(size / 1024).toFixed(0)}KB)`);
}

// ── Asset definitions ──
const imageAssets = [
  {
    name: 'atelier-workshop',
    prompt: 'A moody atmospheric photograph of a luxury furniture workshop interior. Dark wood surfaces, warm golden beam of light streaming through a high window illuminating floating dust particles. Workbench with premium walnut wood planks. Rich warm tones of amber, deep brown, and black. Cinematic lighting, architectural photography, shallow depth of field. No people, no text.',
    ratio: '16:9',
    filename: 'atelier-workshop.jpg',
  },
  {
    name: 'material-walnut',
    prompt: 'Extreme macro photograph of dark walnut wood grain texture. Rich deep brown tones with natural grain patterns visible. Dramatic side lighting revealing the texture depth. Luxury material photography, studio lighting, 8K detail. Abstract, fills entire frame.',
    ratio: '1:1',
    filename: 'material-walnut.jpg',
  },
  {
    name: 'material-marble',
    prompt: 'Extreme macro photograph of white Carrara marble surface with elegant gray veining. Polished surface with soft reflections. Luxury material photography, clean studio lighting. Abstract texture fills entire frame. No objects, no context.',
    ratio: '1:1',
    filename: 'material-marble.jpg',
  },
  {
    name: 'material-brass',
    prompt: 'Extreme macro photograph of brushed brass metal surface. Warm golden tones with fine directional brush marks visible. Subtle warm reflections. Luxury material photography, studio lighting. Abstract texture fills entire frame.',
    ratio: '1:1',
    filename: 'material-brass.jpg',
  },
  {
    name: 'material-leather',
    prompt: 'Extreme macro photograph of premium dark brown Italian leather texture. Visible natural grain and subtle pores. Rich deep chocolate tones. Luxury material photography, soft directional lighting. Abstract texture fills entire frame.',
    ratio: '1:1',
    filename: 'material-leather.jpg',
  },
  {
    name: 'walnut-pbr',
    prompt: 'Seamless tileable dark walnut wood texture for 3D rendering. Consistent grain pattern, no borders or edges visible. Rich warm brown tones. Even lighting with no shadows. Perfect for PBR material mapping. Square format, fills entire frame uniformly.',
    ratio: '1:1',
    filename: 'walnut-pbr.jpg',
  },
];

async function run() {
  const imagesDir = join(__dirname, 'images');

  // ── Step 1: Launch all image tasks in parallel ──
  console.log('=== Launching all Nano Banana image tasks ===\n');
  const tasks = [];
  for (const asset of imageAssets) {
    const taskId = await createImageTask(asset.prompt, asset.ratio);
    if (!taskId) {
      console.error(`Failed to create task for ${asset.name}`);
      continue;
    }
    console.log(`${asset.name}: task ${taskId}`);
    tasks.push({ ...asset, taskId });
    // Small delay between API calls to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  // ── Step 2: Poll all image tasks ──
  console.log('\n=== Polling image tasks ===\n');
  const imageResults = [];
  for (const task of tasks) {
    const result = await pollTask(task.taskId, task.name);
    if (result) {
      const url = result.resultUrls?.[0];
      if (url) {
        const outPath = join(imagesDir, task.filename);
        const maxW = task.ratio === '16:9' ? 1920 : 1024;
        await downloadAndOptimize(url, outPath, maxW);
        imageResults.push({ name: task.name, url, path: outPath });
      }
    }
  }

  // ── Step 3: Generate video from workshop image ──
  const workshopResult = imageResults.find(r => r.name === 'atelier-workshop');
  if (workshopResult) {
    console.log('\n=== Generating Kling 3.0 video from workshop image ===\n');
    const videoPrompt = 'Subtle ambient dust particles floating slowly upward through a warm golden light beam in a dark workshop. Very slow, gentle particle movement. Atmospheric, cinematic. Camera is static, only particles move.';
    const videoTaskId = await createVideoTask(workshopResult.url, videoPrompt);
    if (videoTaskId) {
      const videoResult = await pollTask(videoTaskId, 'VIDEO');
      if (videoResult) {
        const videoUrl = videoResult.resultUrls?.[0];
        if (videoUrl) {
          const videoPath = join(imagesDir, 'hero-dust-raw.mp4');
          await downloadRaw(videoUrl, videoPath);
          console.log('\nVideo downloaded. Run FFmpeg to create seamless loop:');
          console.log(`ffmpeg -i ${videoPath} -filter_complex "[0:v]reverse[r];[0:v][r]concat=n=2:v=1:a=0,setpts=0.5*PTS" ${join(imagesDir, 'hero-dust-loop.mp4')}`);
        }
      }
    }
  }

  console.log('\n=== ALL DONE ===');
  console.log(`Generated ${imageResults.length} images`);
}

run().catch(console.error);
