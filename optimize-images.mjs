import sharp from 'sharp';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const CATEGORIES = {
  'Kujne 1': 'kuhinje',
  'Kupatila': 'kupatila',
  'Plakari': 'plakari',
  'Komode': 'komode',
  'Kijna Cala Sal': 'dnevni-boravak',
};

const FULL_WIDTH = 1920;
const THUMB_WIDTH = 600;
const FULL_QUALITY = 80;
const THUMB_QUALITY = 75;

const manifest = { categories: {} };

async function processCategory(srcDir, catSlug) {
  const fullDir = join(__dirname, 'images', catSlug);
  const thumbDir = join(__dirname, 'images', catSlug, 'thumbs');
  await mkdir(fullDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });

  const files = (await readdir(srcDir)).filter(f =>
    /\.(jpe?g|png)$/i.test(f)
  );

  manifest.categories[catSlug] = [];
  let index = 1;

  for (const file of files) {
    const srcPath = join(srcDir, file);
    const cleanName = `${catSlug}-${String(index).padStart(2, '0')}.jpg`;

    try {
      // Full-size
      await sharp(srcPath)
        .resize({ width: FULL_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: FULL_QUALITY, mozjpeg: true })
        .toFile(join(fullDir, cleanName));

      // Thumbnail
      await sharp(srcPath)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
        .toFile(join(thumbDir, cleanName));

      const meta = await sharp(srcPath).metadata();
      manifest.categories[catSlug].push({
        file: cleanName,
        full: `images/${catSlug}/${cleanName}`,
        thumb: `images/${catSlug}/thumbs/${cleanName}`,
        width: meta.width,
        height: meta.height,
        original: file,
      });

      console.log(`  ✓ ${catSlug}/${cleanName} (from ${file})`);
      index++;
    } catch (err) {
      console.error(`  ✗ Failed: ${file} — ${err.message}`);
    }
  }
}

async function run() {
  console.log('Optimizing images...\n');
  const assetsDir = join(__dirname, 'Firm-assets');

  for (const [srcFolder, catSlug] of Object.entries(CATEGORIES)) {
    console.log(`\n[${catSlug}]`);
    await processCategory(join(assetsDir, srcFolder), catSlug);
  }

  // Write manifest
  const manifestPath = join(__dirname, 'images', 'manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`\n✓ Manifest written to ${manifestPath}`);

  // Summary
  let total = 0;
  for (const [cat, items] of Object.entries(manifest.categories)) {
    console.log(`  ${cat}: ${items.length} images`);
    total += items.length;
  }
  console.log(`\nTotal: ${total} images processed.`);
}

run().catch(console.error);
