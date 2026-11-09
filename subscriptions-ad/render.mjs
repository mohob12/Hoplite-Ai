// Renders index.html frame-by-frame with headless Chrome.
//   node render.mjs                       -> build/frames/f00000.jpg ... + build/cues.json
//   node render.mjs --stills=1.2,5,9.5    -> build/stills/t<sec>.png (video-time seconds)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const CHROME = process.env.CHROME || '/usr/local/bin/google-chrome';
const url = pathToFileURL(path.join(dir, 'index.html')).href;
const workers = +(args.workers || 4);

async function openPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true,
    args: ['--no-sandbox', '--allow-file-access-from-files', '--disable-gpu', '--hide-scrollbars', '--force-color-profile=srgb', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({width: 1080, height: 1920, deviceScaleFactor: 1});
  page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
  await page.goto(url, {waitUntil: 'load'});
  await page.evaluate(() => window.ready);
  return {browser, page};
}

const {browser: b0, page: p0} = await openPage();
const {TOTAL_FRAMES, META, SFX} = await p0.evaluate(() => ({TOTAL_FRAMES, META, SFX}));

if (args.stills) {
  const out = path.join(dir, 'build/stills');
  fs.mkdirSync(out, {recursive: true});
  for (const s of args.stills.split(',')) {
    await p0.evaluate(f => window.seek(f), Math.round(+s * META.FPS));
    await p0.screenshot({path: path.join(out, `t${s}.png`)});
  }
  await b0.close();
  process.exit();
}

const out = path.join(dir, 'build/frames');
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(dir, 'build/cues.json'), JSON.stringify({meta: META, totalFrames: TOTAL_FRAMES, sfx: SFX}, null, 1));
const from = +(args.from || 0), to = +(args.to || TOTAL_FRAMES);
const chunk = Math.ceil((to - from) / workers);
let done = 0;
const t0 = Date.now();
await Promise.all(Array.from({length: workers}, async (_, w) => {
  const {browser, page} = w === 0 ? {browser: b0, page: p0} : await openPage();
  for (let f = from + w * chunk; f < Math.min(to, from + (w + 1) * chunk); f++) {
    await page.evaluate(i => window.seek(i), f);
    await page.screenshot({path: path.join(out, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 93, optimizeForSpeed: true});
    if (++done % 100 === 0) console.log(`${done}/${to - from} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
  await browser.close();
}));
console.log(`rendered ${done} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
