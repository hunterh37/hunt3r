// Scroll-through preview for og:video and og:image. Needs `npm run dev` on :5183.
// Usage: node scripts/og-video.mjs [seconds] [fps]. Writes public/og/preview.mp4 and public/og/cover.jpg (1200x630).
import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const secs = parseFloat(process.argv[2] || '12'), fps = parseInt(process.argv[3] || '24', 10);
const W = 1200, H = 630, N = Math.round(secs * fps);
const tmp = 'notes/shots/og-frames', out = 'public/og';
rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true }); mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', `--window-size=${W},${H}`],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto('http://localhost:5183/?sun=7', { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 30000 });
await new Promise((r) => setTimeout(r, 1500));
const raf = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
for (let i = 0; i < N; i++) {
  const q = ease(i / (N - 1));
  await page.evaluate((q) => window.scrollTo(0, q * (document.documentElement.scrollHeight - innerHeight)), q);
  await raf(); await raf();
  await page.screenshot({ path: `${tmp}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 92 });
}
await page.evaluate(() => window.scrollTo(0, 0)); await raf(); await new Promise((r) => setTimeout(r, 600));
await page.screenshot({ path: `${out}/cover.jpg`, type: 'jpeg', quality: 88 });
await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', `${tmp}/f%04d.jpg`,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-crf', '31', '-preset', 'slow', '-movflags', '+faststart', `${out}/preview.mp4`]);
console.log(`${out}/preview.mp4 ${N} frames`);
