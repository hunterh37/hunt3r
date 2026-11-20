// Stills of pinned timeline positions. Usage: node scripts/shot.mjs <tag> [p,p,p] [width]
// Needs `npm run dev` on :5183. Writes notes/shots/<tag>/p<NNN>.png at 1024 wide.
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';

const tag = process.argv[2] || 'run';
const ps = (process.argv[3] || '0,0.1,0.3,0.5,0.62,0.72,0.76,0.86,0.95,1').split(',').map(Number);
const width = parseInt(process.argv[4] || '1024', 10);
const height = Math.round(width * (width < 600 ? 2.1 : 0.625));
const out = `notes/shots/${tag}`;
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${width},${height}`],
});
const page = await browser.newPage();
await page.setViewport({ width, height, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
for (const p of ps) {
  await page.goto(`http://localhost:5183/?p=${p}&t=3`, { waitUntil: 'load' });
  await page.waitForFunction('window.__ready === true', { timeout: 20000 }).catch(() => errors.push(`p=${p} never ready`));
  await new Promise((r) => setTimeout(r, 700));
  const name = `${out}/p${String(Math.round(p * 100)).padStart(3, '0')}.png`;
  await page.screenshot({ path: name });
  console.log(name);
}
if (errors.length) console.log('ERRORS:\n' + [...new Set(errors)].slice(0, 12).join('\n'));
await browser.close();
