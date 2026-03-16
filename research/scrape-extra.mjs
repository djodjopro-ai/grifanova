import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const API_KEY = envContent.match(/FIRECRAWL_API_KEY=(.+)/)?.[1]?.trim();

const competitors = [
  { name: 'Lesnina', url: 'https://www.lfrnamestaj.rs' },
  { name: 'Modul Sistem', url: 'https://www.modulsistem.rs' },
  { name: 'Artemida Enterijer', url: 'https://artemida-enterijer.rs' },
  { name: 'Aran no-www', url: 'https://aran.rs/italijanski-namestaj/kuhinje/' },
  { name: 'Gorenje Kuhinje', url: 'https://www.gorenje.rs/kuhinje' },
];

mkdirSync(join(__dirname, 'raw'), { recursive: true });

async function scrapeUrl(url) {
  const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 30000,
    }),
  });
  return res.json();
}

for (const comp of competitors) {
  console.log(`Scraping ${comp.name} (${comp.url})...`);
  try {
    const data = await scrapeUrl(comp.url);
    const content = data?.data?.markdown || data?.data?.content || JSON.stringify(data, null, 2);
    const filename = comp.name.toLowerCase().replace(/\s+/g, '-') + '.md';
    writeFileSync(join(__dirname, 'raw', filename), content);
    console.log(`  ✓ ${comp.name} - ${content.length} chars`);
  } catch (err) {
    console.log(`  ✗ ${comp.name} - ${err.message}`);
  }
}
console.log('Done.');
