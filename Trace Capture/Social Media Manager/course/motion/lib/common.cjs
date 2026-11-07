/**
 * Shared paths, process adapters and source fingerprints for offline course production.
 * Dependencies: Node filesystem/crypto/process APIs and local FFmpeg/FFprobe.
 * Consumed by: audio preparation, deterministic rendering, verification and CLI modules.
 * Why: every production stage must agree on immutable source audio and artifact locations.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const MOTION = path.resolve(__dirname, '..');
const COURSE = path.resolve(MOTION, '..');
const projectRequire = createRequire(path.resolve(COURSE, '../../../package.json'));
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const FPS = 30;
const SIZE = { width: 1280, height: 720 };
const SAMPLE_RATE = 44100;
const IDS = Array.from({ length: 10 }, (_, i) => String(i + 1).padStart(2, '0'));
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const relative = (file) => path.relative(COURSE, file).split(path.sep).join('/');
const lessonDirectory = (id) => path.join(COURSE, id === '01' ? 'pilot' : `productions/${id}`);
/** Reads the generated browser assignment, including formatter-normalized JavaScript syntax. */
function parsePresentation(source) {
  const context = { window: {} };
  vm.runInNewContext(source, context, { timeout: 1000 });
  if (!context.window.COURSE_DATA || !Array.isArray(context.window.COURSE_DATA.scenes))
    throw new Error('Generated presentation-data.js has no COURSE_DATA scenes; rerun prepare.');
  return context.window.COURSE_DATA;
}
function readPresentation(lesson) {
  return parsePresentation(
    fs.readFileSync(path.join(lessonDirectory(lesson), 'presentation-data.js'), 'utf8'),
  );
}
function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}
function ffmpeg(args, options = {}) {
  return execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  });
}
function probe(file) {
  return JSON.parse(
    execFileSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], {
      encoding: 'utf8',
    }),
  );
}
/** Checks every retained audio/alignment/receipt/caption source against the pre-rollout baseline. */
function assertBaseline() {
  const baseline = readJson(path.join(MOTION, 'audio-baseline.json'));
  if (baseline.audioClipCount !== 130)
    throw new Error('Audio baseline must contain130 clips; restore the pre-rollout baseline.');
  for (const entry of baseline.files) {
    const target = path.join(COURSE, entry.path);
    if (!fs.existsSync(target) || digest(fs.readFileSync(target)) !== entry.sha256)
      throw new Error(
        `Original source changed: ${entry.path}. Restore the approved source; do not regenerate speech.`,
      );
  }
  return baseline.files.length;
}
function paragraphs(id) {
  const html = fs.readFileSync(path.join(COURSE, `lessons/${id}.html`), 'utf8');
  const article = html.match(/<article[^>]*id="lecture-script"[^>]*>([\s\S]*?)<\/article>/i);
  if (!article) throw new Error(`Lesson${id} lecture-script missing; restore its canonical HTML.`);
  return [...article[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((m) =>
    m[1]
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'"),
  );
}
/** Fingerprints all browser sources/assets plus this lesson's compiled data and storyboard. */
function sourceFingerprint(id) {
  const targets = new Set([
    path.join(lessonDirectory(id), 'presentation.html'),
    path.join(lessonDirectory(id), 'presentation-data.js'),
    path.join(MOTION, `storyboards/${id}.json`),
  ]);
  const collect = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (
        ['lib', 'storyboards', 'frames', 'review', 'verification-frames', 'node_modules'].includes(
          entry.name,
        )
      )
        continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (/\.(?:js|css|html|png|svg|jpe?g|webp|woff2)$/.test(entry.name)) targets.add(file);
    }
  };
  collect(MOTION);
  // The approved opening is a shared source and its illustration may be reused by later scenes.
  for (const name of [
    'index.html',
    'preview.js',
    'preview.css',
    'metadata.js',
    'assets/performer.png',
  ])
    targets.add(path.join(COURSE, 'style-preview', name));
  const files = [...targets]
    .sort()
    .map((file) => ({ path: relative(file), sha256: digest(fs.readFileSync(file)) }));
  return { sha256: digest(JSON.stringify(files)), files };
}
module.exports = {
  fs,
  path,
  MOTION,
  COURSE,
  projectRequire,
  FFMPEG,
  FPS,
  SIZE,
  SAMPLE_RATE,
  IDS,
  digest,
  readJson,
  relative,
  lessonDirectory,
  writeJson,
  ffmpeg,
  probe,
  assertBaseline,
  paragraphs,
  sourceFingerprint,
  parsePresentation,
  readPresentation,
};
