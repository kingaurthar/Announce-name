// Renders reel.html to an MP4 (1080x1920, 30fps) with a generated music bed.
//   node render.js                 -> out/reel.mp4
//   node render.js --stills 3,30   -> out/still-3.png, out/still-30.png
// Needs: Playwright + Chromium, ffmpeg on PATH.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.join(__dirname, 'reel.html') + '?render');
  await page.evaluate(() => window.ready);
  const dur = await page.evaluate(() => window.DUR);

  const si = process.argv.indexOf('--stills');
  if (si > -1) {
    for (const s of process.argv[si + 1].split(',')) {
      const png = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/png'); }, +s);
      fs.writeFileSync(path.join(OUT, `still-${s}.png`), Buffer.from(png.split(',')[1], 'base64'));
    }
    await browser.close();
    return;
  }

  const music = path.join(OUT, 'music.wav');
  makeMusic(music, dur);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', music,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart',
    path.join(OUT, 'reel.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = Math.round(dur * FPS);
  for (let f = 0; f < total; f++) {
    const jpg = await page.evaluate(t => { renderFrame(t); return document.getElementById('c').toDataURL('image/jpeg', 0.93); }, f / FPS);
    if (!ff.stdin.write(Buffer.from(jpg.split(',')[1], 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) process.stdout.write(`frame ${f}/${total}\n`);
  }
  ff.stdin.end();
  await new Promise((res, rej) => ff.on('close', c => (c === 0 ? res() : rej(new Error('ffmpeg exit ' + c)))));
  await browser.close();
  console.log('done ->', path.join(OUT, 'reel.mp4'));
}

// Cinematic bed: low drone + war-drum pulse + a boom on every scene cut.
function makeMusic(file, dur) {
  const cuts = [6, 14, 24, 34, 42, 48, 56, 66, 74, 82];
  const boom = cuts.map(c => `gte(t,${c})*0.55*sin(2*PI*(42*(t-${c})+30*(1-exp(-(t-${c})*6))/6))*exp(-(t-${c})*2.2)`).join('+');
  const m = 'mod(t,0.75)';
  const drum = `0.38*sin(2*PI*(55*${m}+90*(1-exp(-${m}*28))/28))*exp(-${m}*9)`;
  const drone = '0.10*sin(2*PI*55*t)+0.07*sin(2*PI*82.41*t)*(0.6+0.4*sin(2*PI*0.07*t))+0.05*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.11*t))';
  // drums sit out in the sombre graves section, swell back for WW2
  const drumGate = '(1-0.85*between(t,42,48))*(1-0.5*between(t,82,90))';
  const expr = `(${drone})+(${drum})*${drumGate}+${boom}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i',
    `aevalsrc='${expr}':s=44100:d=${dur}`,
    '-af', `lowpass=f=1800,afade=t=in:d=1.5,afade=t=out:st=${dur - 2.5}:d=2.5,alimiter=limit=0.9`, file]);
}

main().catch(e => { console.error(e); process.exit(1); });
