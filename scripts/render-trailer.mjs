#!/usr/bin/env node
/* global window */
/**
 * Headless render of the sequence to an MP4 "trailer".
 *
 * The page is loaded with ?headless=1, which disables the rAF loop and exposes
 * window.__dc.seek(t). We step the GSAP timeline deterministically, screenshot
 * every frame, then stitch them with ffmpeg (libx264, yuv420p).
 *
 * Usage:
 *   npm run render:trailer -- [options]
 *
 * Options:
 *   --url <http://host:port>  page to render (default http://127.0.0.1:5173, i.e. `npm run dev`)
 *   --serve                   start a Vite dev server on a free port for the duration of the render
 *   --out <file>              output file (default render/trailer.mp4)
 *   --fps <n>                 frames per second (default 30)
 *   --width <px> --height <px>  frame size (default 1920×1080)
 *   --from <s> --to <s>       time range in timeline seconds (default: whole sequence)
 *   --speed <x>               playback speed multiplier (default 1)
 *   --chrome <path>           Chrome/Chromium executable (or set CHROME_PATH / PUPPETEER_EXECUTABLE_PATH)
 *   --keep-frames             keep the PNG frames next to the output
 *
 * Requirements: a Chrome/Chromium binary (puppeteer-core does not download one;
 * `npm i -D puppeteer` is the zero-config alternative) and ffmpeg on PATH.
 * If ffmpeg is missing the frames are kept and the exact command is printed.
 */

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ------------------------------------------------------------------ args
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);

const options = {
  url: opt('url', 'http://127.0.0.1:5173'),
  serve: flag('serve'),
  out: path.resolve(ROOT, opt('out', 'render/trailer.mp4')),
  fps: Number(opt('fps', 30)),
  width: Number(opt('width', 1920)),
  height: Number(opt('height', 1080)),
  from: opt('from', null),
  to: opt('to', null),
  speed: Number(opt('speed', 1)),
  chrome: opt('chrome', process.env.CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH || null),
  keepFrames: flag('keep-frames'),
};

// ------------------------------------------------------------------ chrome
function findChrome() {
  if (options.chrome) return options.chrome;
  try {
    // Full puppeteer (with its downloaded browser) if the user installed it.
    const puppeteer = require('puppeteer');
    return puppeteer.executablePath();
  } catch {
    /* not installed */
  }
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  ];
  const found = candidates.find((p) => existsSync(p));
  if (found) return found;
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], {
      encoding: 'utf8',
    });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim().split('\n')[0];
  }
  return null;
}

// ------------------------------------------------------------------ optional dev server
async function startServer() {
  const port = 5199;
  const child = spawn(
    'npx',
    ['vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: process.platform === 'win32',
    }
  );
  const url = `http://127.0.0.1:${port}`;
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Vite did not start in time')), 20000);
    child.stdout.on('data', (d) => {
      if (String(d).includes('Local:')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('exit', (code) => reject(new Error(`Vite exited with code ${code}`)));
  });
  return { url, stop: () => child.kill() };
}

// ------------------------------------------------------------------ main
async function main() {
  const chromePath = findChrome();
  if (!chromePath) {
    console.error(
      'No Chrome/Chromium found. Pass --chrome <path>, set CHROME_PATH, or `npm i -D puppeteer`.'
    );
    process.exit(1);
  }
  const puppeteer = await import('puppeteer-core');

  let server = null;
  if (options.serve) {
    server = await startServer();
    options.url = server.url;
    console.log(`Vite dev server started at ${options.url}`);
  }

  const framesDir = path.join(path.dirname(options.out), 'frames');
  rmSync(framesDir, { recursive: true, force: true });
  mkdirSync(framesDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      `--window-size=${options.width},${options.height}`,
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: options.width, height: options.height, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => console.error('[page error]', e.message));

    const target = `${options.url.replace(/\/$/, '')}/?headless=1`;
    console.log(`Loading ${target}`);
    await page.goto(target, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => Boolean(window.__dc), { timeout: 30000 });

    const duration = await page.evaluate(() => window.__dc.duration);
    const from = options.from == null ? 0 : Number(options.from);
    const to = options.to == null ? duration : Math.min(duration, Number(options.to));
    const dt = options.speed / options.fps;
    const frameCount = Math.max(1, Math.ceil((to - from) / dt));
    console.log(
      `Sequence ${duration.toFixed(1)}s · rendering ${from.toFixed(1)}s → ${to.toFixed(1)}s at ${options.fps} fps ×${options.speed} = ${frameCount} frames`
    );

    await page.evaluate((w, h) => window.__dc.setSize(w, h), options.width, options.height);

    const started = Date.now();
    for (let i = 0; i < frameCount; i++) {
      const t = Math.min(to, from + i * dt);
      await page.evaluate((tt) => window.__dc.seek(tt), t);
      const png = await page.screenshot({ type: 'png', captureBeyondViewport: false });
      writeFileSync(path.join(framesDir, `${String(i).padStart(5, '0')}.png`), png);
      if (i % Math.max(1, Math.floor(frameCount / 20)) === 0 || i === frameCount - 1) {
        const pct = (((i + 1) / frameCount) * 100).toFixed(0).padStart(3);
        const elapsed = ((Date.now() - started) / 1000).toFixed(0);
        process.stdout.write(
          `\r  ${pct}%  frame ${i + 1}/${frameCount}  t=${t.toFixed(2)}s  (${elapsed}s)`
        );
      }
    }
    process.stdout.write('\n');
  } finally {
    await browser.close();
    if (server) server.stop();
  }

  // -------------------------------------------------------------- ffmpeg
  const ffmpegArgs = [
    '-y',
    '-loglevel',
    'error',
    '-framerate',
    String(options.fps),
    '-i',
    path.join(framesDir, '%05d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '18',
    '-movflags',
    '+faststart',
    options.out,
  ];
  const has = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  if (has.error || has.status !== 0) {
    console.log('\nffmpeg not found. Frames kept in', framesDir);
    console.log(
      'Stitch them with:\n  ffmpeg',
      ffmpegArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ')
    );
    return;
  }
  console.log('Encoding with ffmpeg…');
  const enc = spawnSync('ffmpeg', ffmpegArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (enc.status !== 0) {
    console.error('ffmpeg failed; frames kept in', framesDir);
    process.exit(enc.status ?? 1);
  }
  if (!options.keepFrames) rmSync(framesDir, { recursive: true, force: true });
  console.log(`Done → ${options.out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
