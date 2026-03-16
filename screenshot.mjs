import puppeteer from 'puppeteer';
import { mkdir, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIR = join(__dirname, 'temporary screenshots');

const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

await mkdir(DIR, { recursive: true });

const files = await readdir(DIR);
const nums = files.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1])).filter(Boolean);
const next = (nums.length ? Math.max(...nums) : 0) + 1;
const filename = `screenshot-${next}${label ? '-' + label : ''}.png`;

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
const viewportWidth = parseInt(process.argv[4]) || 1440;
const viewportHeight = parseInt(process.argv[5]) || 900;
await page.setViewport({ width: viewportWidth, height: viewportHeight });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

// Auto-scroll to trigger GSAP ScrollTrigger reveals
await page.evaluate(async () => {
  const distance = 300;
  const delay = 100;
  const height = document.body.scrollHeight;
  for (let i = 0; i < height; i += distance) {
    window.scrollTo(0, i);
    await new Promise(r => setTimeout(r, delay));
  }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 500));
});

await page.screenshot({ path: join(DIR, filename), fullPage: true });
await browser.close();

console.log(`Saved: ${join(DIR, filename)}`);
