import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const API_KEY = envContent.match(/FIRECRAWL_API_KEY=(.+)/)?.[1]?.trim();

if (!API_KEY) {
  console.error('FIRECRAWL_API_KEY not found in .env');
  process.exit(1);
}

const competitors = [
  { name: 'Aran Cucine Srbija', url: 'https://www.aran.rs' },
  { name: 'Veneta Cucine Srbija', url: 'https://www.venetacucine.rs' },
  { name: 'Stolar', url: 'https://www.stolar.rs' },
  { name: 'Meblo Trade', url: 'https://www.meblotrade.rs' },
  { name: 'Forma Ideale', url: 'https://www.formaideale.rs' },
  { name: 'MN Kuhinje', url: 'https://www.mnkuhinje.rs' },
  { name: 'Matis', url: 'https://www.matis.rs' },
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

const results = [];

for (const comp of competitors) {
  console.log(`Scraping ${comp.name} (${comp.url})...`);
  try {
    const data = await scrapeUrl(comp.url);
    const content = data?.data?.markdown || data?.data?.content || JSON.stringify(data, null, 2);
    const filename = comp.name.toLowerCase().replace(/\s+/g, '-') + '.md';
    writeFileSync(join(__dirname, 'raw', filename), content);
    results.push({ ...comp, status: 'success', contentLength: content.length });
    console.log(`  ✓ ${comp.name} - ${content.length} chars`);
  } catch (err) {
    results.push({ ...comp, status: 'error', error: err.message });
    console.log(`  ✗ ${comp.name} - ${err.message}`);
  }
}

writeFileSync(join(__dirname, 'scrape-results.json'), JSON.stringify(results, null, 2));
console.log('\nDone. Results saved to research/scrape-results.json');
