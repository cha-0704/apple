// HyperFrames CLI 없이도 렌더링되는 로컬 렌더러: Chromium으로 프레임을 seek→캡처→ffmpeg 인코딩, 음성이 있으면 합성.
//   node tools/render.cjs projects/compound_interest/infographic [out.mp4] [--fps 30] [--from 0] [--to 999] [--scale 1]
const { execFileSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  try { return require('playwright'); } catch (e) {}
  const g = execFileSync('npm', ['root', '-g']).toString().trim();
  return require(path.join(g, 'playwright'));
}

const args = process.argv.slice(2);
const opt = (k, v) => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : v; };
const fps = +opt('--fps', 30), from = +opt('--from', 0), to = +opt('--to', 1e9), scale = +opt('--scale', 1);
const dir = path.resolve(args[0]);
const out = path.resolve(args[1] || path.join(dir, '..', '..', '..', 'output', `${path.basename(path.dirname(dir))}_${path.basename(dir)}.mp4`));
fs.mkdirSync(path.dirname(out), { recursive: true });

(async () => {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  // 오프라인 환경에서도 멈추지 않게: 외부 폰트/CDN 요청이 실패하면 그냥 로컬 폰트로 진행
  await page.route(/^https?:/, (r) => (process.env.OFFLINE ? r.abort() : r.continue().catch(() => r.abort())));
  await page.goto('file://' + path.join(dir, 'index.html') + '?render=1', { waitUntil: 'load', timeout: 60000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.__hfDuration);
  const t1 = Math.min(total, to), n = Math.ceil((t1 - from) * fps);
  const audio = path.join(dir, 'audio', 'narration.wav');
  const hasAudio = fs.existsSync(audio);

  const ff = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
  if (hasAudio) ff.push('-ss', String(from), '-t', String(t1 - from), '-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  ff.push('-vf', 'scale=1920:1080', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out);
  const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'ignore', 'inherit'] });

  const started = Date.now();
  for (let i = 0; i < n; i++) {
    const t = from + i / fps;
    await page.evaluate((tt) => window.__hfSeek(tt), t);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % (fps * 10) === 0) {
      const el = (Date.now() - started) / 1000;
      process.stdout.write(`\r${t.toFixed(0)}s / ${t1.toFixed(0)}s  (${(i / Math.max(el, 0.01)).toFixed(1)} fps)   `);
    }
  }
  enc.stdin.end();
  await new Promise((r) => enc.on('close', r));
  await browser.close();
  console.log(`\n완료 → ${out}  (${hasAudio ? '음성 포함' : '무음'})`);
})();
