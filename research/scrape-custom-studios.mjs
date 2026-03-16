import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const API_KEY = envContent.match(/FIRECRAWL_API_KEY=(.+)/)?.[1]?.trim();

const competitors = [
  { name: 'Design Studio In', url: 'https://design-studioin.com/' },
  { name: 'Moja 4 Zida', url: 'https://moja4zida.rs/' },
  { name: 'Kraken Design', url: 'https://krakendesign.rs/' },
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
