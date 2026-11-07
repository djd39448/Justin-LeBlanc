/**
 * Captures deterministic HTML animations and promotes only verified course videos.
 * Dependencies: shared adapters, audio provenance checks, range server, verifier, Playwright/FFmpeg.
 * Consumed by: build-course render/stills; browser sources expose renderAt and frameKey.
 * Why: approved animation must appear in the MP4 while stable reading holds can reuse frame bytes.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const c = require('./common.cjs');
const { assertPrepared } = require('./audio.cjs');
const { startServer } = require('./server.cjs');
const { verify } = require('./verify.cjs');
const { auditLesson } = require('./layout-audit.cjs');
const { compareFrames } = require('./frame-comparison.cjs');
async function captureSession(lesson) {
  const local = await startServer(),
    { chromium } = c.projectRequire('playwright');
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: c.SIZE, deviceScaleFactor: 1 });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      route
        .request()
        .url()
        .startsWith(local.origin + '/')
        ? route.continue()
        : route.abort(),
    );
    await page.goto(
      `${local.origin}/${c.relative(c.lessonDirectory(lesson))}/presentation.html?capture=1`,
      { waitUntil: 'networkidle' },
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      if (typeof window.renderAt !== 'function' || typeof window.frameKey !== 'function')
        throw new Error(
          'Browser renderer needs renderAt(seconds) and frameKey(seconds); restore shared motion scripts.',
        );
    });
    const box = await page.locator('#stage').boundingBox();
    if (
      !box ||
      box.x !== 0 ||
      box.y !== 0 ||
      box.width !== c.SIZE.width ||
      box.height !== c.SIZE.height
    )
      throw new Error('Capture stage must be1280×720 at(0,0); fix capture CSS.');
    return {
      page,
      errors,
      close: async () => {
        await browser.close();
        local.server.close();
      },
    };
  } catch (error) {
    if (browser) await browser.close();
    local.server.close();
    throw error;
  }
}
/** Checks that equal hold keys really yield identical frames and seeking is deterministic. */
async function auditTimeline(page, timing) {
  let holdChecks = 0;
  const holdComparisons = [];
  for (const index of [0, 6, 12]) {
    const segment = timing.segments[index];
    const a = segment.end - 1.6,
      b = segment.end - 0.8;
    const keys = await page.evaluate(({ a, b }) => [window.frameKey(a), window.frameKey(b)], {
      a,
      b,
    });
    if (keys[0] !== keys[1]) continue;
    await page.evaluate((time) => window.renderAt(time), a);
    const first = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...c.SIZE } });
    await page.evaluate((time) => window.renderAt(time), b);
    const second = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...c.SIZE } });
    const comparison = compareFrames(first, second);
    holdComparisons.push({ scene: segment.id, ...comparison });
    if (!comparison.accepted)
      throw new Error(
        `Lesson ${timing.lesson}: frameKey froze changing content. Fix the hold-key contract before rendering.`,
      );
    holdChecks++;
  }
  const time = timing.segments[6].start + 5;
  await page.evaluate((time) => window.renderAt(time), time);
  const initial = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...c.SIZE } });
  await page.evaluate(() => window.renderAt(1));
  await page.evaluate((time) => window.renderAt(time), time);
  const repeated = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, ...c.SIZE } });
  const seekComparison = compareFrames(initial, repeated);
  if (!seekComparison.accepted)
    throw new Error(
      `Lesson ${timing.lesson}: backward seeking changed the same-time visual. Fix deterministic drawing before rendering.`,
    );
  return {
    stableHoldChecks: holdChecks,
    holdComparisons,
    sameTimeAfterSeeking: seekComparison.changedPixels
      ? 'equivalent within rasterization tolerance'
      : 'pixel-identical',
    seekComparison,
    rasterizationTolerance: {
      maximumChangedPixels: 4,
      maximumChannelDelta: 16,
      maximumSummedAbsoluteChannelDelta: 40,
    },
  };
}

function encoder(root) {
  const proc = spawn(
    c.FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(c.FPS),
      '-vcodec',
      'mjpeg',
      '-i',
      'pipe:0',
      '-an',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '19',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(c.FPS),
      '-movflags',
      '+faststart',
      c.path.join(root, '.motion-work/animated.mp4'),
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let stderr = '';
  const state = { error: null };
  proc.stderr.on('data', (chunk) => {
    stderr = (stderr + chunk).slice(-4000);
  });
  proc.stdin.on('error', (error) => {
    state.error = error;
  });
  const completed = new Promise((resolve) => {
    proc.once('error', (error) => resolve({ error }));
    proc.once('close', (code) =>
      resolve(
        code === 0
          ? {}
          : {
              error: new Error(
                `FFmpeg capture failed(${code}):${stderr}. Check disk space and encoder availability.`,
              ),
            },
      ),
    );
  });
  return { proc, completed, state };
}
async function captureFrames(page, timing, output) {
  const frames = Math.ceil(timing.duration * c.FPS),
    samples = [];
  let previousKey,
    bytes,
    captures = 0;
  for (let frame = 0; frame < frames; frame++) {
    if (output.state.error) throw output.state.error;
    const time = frame / c.FPS;
    const key = await page.evaluate(
      async ({ time, previousKey }) => {
        const key = String(await window.frameKey(time));
        if (key !== previousKey) await window.renderAt(time);
        return key;
      },
      { time, previousKey },
    );
    if (!bytes || key !== previousKey) {
      bytes = await page.screenshot({ type: 'jpeg', quality: 94, clip: { x: 0, y: 0, ...c.SIZE } });
      captures++;
      previousKey = key;
    }
    if (!output.proc.stdin.write(bytes)) await once(output.proc.stdin, 'drain');
    if (frame % (c.FPS * 10) === 0) samples.push({ time, sha256: c.digest(bytes) });
    if (frame % (c.FPS * 30) === 0)
      process.stderr.write(
        `Lesson${timing.lesson}: captured${time.toFixed(0)}/${timing.duration.toFixed(1)}s (${captures} unique renders)\n`,
      );
  }
  output.proc.stdin.end();
  const result = await output.completed;
  if (result.error) throw result.error;
  return {
    encodedFrames: frames,
    browserCaptures: captures,
    heldFrames: frames - captures,
    sampledFrameHashes: samples,
  };
}
function mux(root, timing) {
  const pending = c.path.join(root, '.motion-work/lesson-pending.mp4');
  c.ffmpeg([
    '-i',
    c.path.join(root, '.motion-work/animated.mp4'),
    '-i',
    c.path.join(root, 'narration.m4a'),
    '-i',
    c.path.join(root, 'captions.vtt'),
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-map',
    '2:0',
    '-c:v',
    'copy',
    '-c:a',
    'copy',
    '-c:s',
    'mov_text',
    '-metadata:s:s:0',
    'language=eng',
    '-t',
    String(timing.duration),
    '-movflags',
    '+faststart',
    pending,
  ]);
  return pending;
}
/** Produces scene PNGs and a poster from the same deterministic state used by the final video. */
async function stills(lesson) {
  const root = c.lessonDirectory(lesson),
    timing = c.readJson(c.path.join(root, 'timing.json'));
  assertPrepared(lesson, timing);
  const data = c.readPresentation(lesson);
  const directory = c.path.join(root, 'motion-frames');
  c.fs.mkdirSync(directory, { recursive: true });
  const session = await captureSession(lesson),
    frames = [];
  try {
    for (const scene of data.scenes) {
      const time =
        scene.kind === 'approved-opening'
          ? scene.id === '01'
            ? 7.95
            : scene.start + 20.4
          : scene.start +
            Math.min(scene.duration - 0.5, Math.max(...scene.items.map((item) => item.at)) + 1.3);
      await session.page.evaluate((time) => window.renderAt(time), time);
      const file = c.path.join(directory, `scene-${scene.id}.png`);
      await session.page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, ...c.SIZE } });
      frames.push({ scene: scene.id, kind: scene.kind, time, path: c.relative(file) });
    }
    if (session.errors.length)
      throw new Error(
        `Lesson${lesson} browser errors:${session.errors.join('; ')}. Fix sources before rendering.`,
      );
    c.fs.copyFileSync(c.path.join(c.COURSE, frames[0].path), c.path.join(root, 'poster.png'));
    return { lesson, status: 'captured', frames };
  } finally {
    await session.close();
  }
}
/** Renders an entire lesson offline and replaces the existing MP4 only after verification succeeds. */
async function render(lesson) {
  const root = c.lessonDirectory(lesson),
    timing = c.readJson(c.path.join(root, 'timing.json'));
  assertPrepared(lesson, timing);
  c.fs.mkdirSync(c.path.join(root, '.motion-work'), { recursive: true });
  const fingerprint = c.sourceFingerprint(lesson),
    session = await captureSession(lesson),
    output = encoder(root),
    started = Date.now();
  const cancel = () => {
    output.state.error = new Error(
      `Lesson ${lesson}: rendering interrupted; the existing verified MP4 was not replaced. Restart render when ready.`,
    );
  };
  process.once('SIGINT', cancel);
  process.once('SIGTERM', cancel);
  try {
    const timelineAudit = await auditTimeline(session.page, timing);
    const frames = await captureFrames(session.page, timing, output);
    if (session.errors.length)
      throw new Error(
        `Lesson${lesson}: browser errors:${session.errors.join('; ')}. Fix sources before rerender.`,
      );
    if (c.sourceFingerprint(lesson).sha256 !== fingerprint.sha256)
      throw new Error(
        `Lesson${lesson}: browser sources changed during render. Rerun with stable sources.`,
      );
    const pending = mux(root, timing),
      report = {
        ...verify(lesson, pending),
        ...frames,
        timelineAudit,
        renderSeconds: (Date.now() - started) / 1000,
        renderer: 'Deterministic30fps HTML animation with cached unchanged reading holds',
        browserErrors: session.errors,
      };
    const target = c.path.join(root, `lesson-${lesson}.mp4`);
    c.fs.renameSync(pending, target);
    c.writeJson(c.path.join(root, 'render-report.json'), report);
    return report;
  } finally {
    process.removeListener('SIGINT', cancel);
    process.removeListener('SIGTERM', cancel);
    output.proc.stdin.destroy();
    output.proc.kill();
    await session.close();
  }
}
async function audit(lesson) {
  return auditLesson(lesson, captureSession);
}
module.exports = { render, stills, audit, captureSession };
