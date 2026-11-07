#!/usr/bin/env node
/**
 * Rebuilds the style preview from approved Brian audio and deterministic HTML frames.
 * Dependencies: local FFmpeg/FFprobe, Playwright in the repository, Node built-ins.
 * Depended on by: preview maintainers and the style-review verification workflow.
 * Why: animation must survive MP4 export without regenerating approved narration.
 * No provider calls, credentials, external downloads, or source-audio edits occur here.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- This offline CLI is explicitly CommonJS, matching the existing course renderer. */

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { execFileSync, spawn } = require('node:child_process');
const { once } = require('node:events');
const { createRequire } = require('node:module');

const ROOT = __dirname;
const PILOT = path.resolve(ROOT, '../pilot');
const PROJECT_REQUIRE = createRequire(path.resolve(ROOT, '../../../../package.json'));
const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';
const SAMPLE_RATE = 44100;
const CHANNELS = 1;
const BYTES_PER_SAMPLE = 2;
const FPS = 30;
const SIZE = { width: 1280, height: 720 };
const SEGMENT_IDS = ['01', '02'];
const file = (name) => path.join(ROOT, name);
const digest = (value) => crypto.createHash('sha256').update(value).digest('hex');

function writeJson(name, value) {
  fs.writeFileSync(file(name), `${JSON.stringify(value, null, 2)}\n`);
}

function ffmpeg(args, options = {}) {
  return execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    maxBuffer: 64 * 1024 * 1024,
    ...options,
  });
}

function probe(target) {
  return JSON.parse(
    execFileSync(FFPROBE, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', target], {
      encoding: 'utf8',
    }),
  );
}

function canonicalParagraphs() {
  const html = fs.readFileSync(path.resolve(ROOT, '../lessons/01.html'), 'utf8');
  const article = html.match(/<article[^>]*id="lecture-script"[^>]*>([\s\S]*?)<\/article>/i);
  if (!article)
    throw new Error('Canonical lecture-script missing; restore Lesson 01 before preparing.');
  return [...article[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((match) =>
    match[1]
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

function alignedWords(chunks, segmentOffset) {
  if (!Array.isArray(chunks) || !chunks.length)
    throw new Error('Missing provider alignment; restore the pilot alignment JSON.');
  const words = [];
  let text = '',
    start = 0,
    end = 0,
    offset = 0,
    last = 0;
  const flush = () => {
    if (text.trim())
      words.push({ text: text.trim(), start: start + segmentOffset, end: end + segmentOffset });
    text = '';
  };
  for (const chunk of chunks) {
    const chars = chunk.characters;
    const starts = chunk.character_start_times_seconds;
    const ends = chunk.character_end_times_seconds;
    if (
      !chars ||
      !starts ||
      !ends ||
      chars.length !== starts.length ||
      chars.length !== ends.length
    ) {
      throw new Error(
        'Invalid character alignment; restore matching pilot timestamps before preparing.',
      );
    }
    if (Number(starts[0]) + offset < last - 0.01) offset = last;
    chars.forEach((character, index) => {
      const a = Number(starts[index]) + offset,
        b = Number(ends[index]) + offset;
      if (!Number.isFinite(a) || !Number.isFinite(b) || b < a)
        throw new Error('Invalid alignment time; inspect pilot timestamps.');
      if (/\s/.test(character)) flush();
      else {
        if (!text) start = a;
        text += character;
        end = b;
      }
      last = Math.max(last, b);
    });
  }
  flush();
  return words;
}

function seconds(value) {
  const [hours, minutes, secs] = value.split(':').map(Number);
  return hours * 3600 + minutes * 60 + secs;
}

function timestamp(value) {
  const milliseconds = Math.round(value * 1000);
  const pad = (number, length = 2) => String(number).padStart(length, '0');
  return `${pad(Math.floor(milliseconds / 3600000))}:${pad(Math.floor(milliseconds / 60000) % 60)}:${pad(Math.floor(milliseconds / 1000) % 60)}.${pad(milliseconds % 1000, 3)}`;
}

function readCaptions(id, offset) {
  const vtt = fs.readFileSync(path.join(PILOT, 'captions', `${id}.vtt`), 'utf8');
  const pattern =
    /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n([^\n]+(?:\n[^\n]+)?)/g;
  const cues = [...vtt.matchAll(pattern)].map((match) => ({
    start: seconds(match[1]) + offset,
    end: seconds(match[2]) + offset,
    text: match[3],
  }));
  if (!cues.length)
    throw new Error(`No captions for segment ${id}; restore pilot captions before preparing.`);
  return cues;
}

function prepareSegment(id, spoken, start) {
  const input = path.join(PILOT, 'audio', `${id}.mp3`);
  const alignment = JSON.parse(
    fs.readFileSync(path.join(PILOT, 'alignment', `${id}.json`), 'utf8'),
  );
  if (digest(spoken) !== alignment.sourceSha256)
    throw new Error(
      `Script/alignment mismatch in ${id}; reconcile approved narration before preparing.`,
    );
  const pcm = ffmpeg([
    '-i',
    input,
    '-f',
    's16le',
    '-acodec',
    'pcm_s16le',
    '-ar',
    String(SAMPLE_RATE),
    '-ac',
    String(CHANNELS),
    'pipe:1',
  ]);
  const samples = pcm.length / BYTES_PER_SAMPLE / CHANNELS;
  if (!Number.isInteger(samples) || samples < SAMPLE_RATE)
    throw new Error(`Invalid decoded audio ${id}; inspect retained MP3.`);
  const duration = samples / SAMPLE_RATE;
  return {
    pcm,
    segment: {
      id,
      source: `../pilot/audio/${id}.mp3`,
      sha256: digest(fs.readFileSync(input)),
      sourceTextSha256: alignment.sourceSha256,
      start,
      end: start + duration,
      duration,
      samples,
      words: alignedWords(alignment.timestamps, start),
      captions: readCaptions(id, start),
      spoken,
    },
  };
}

/** Prepares exact sample-based audio/timing artifacts; returns the timing manifest. */
function prepare() {
  fs.mkdirSync(ROOT, { recursive: true });
  const spoken = canonicalParagraphs(),
    buffers = [],
    segments = [];
  let duration = 0;
  for (const [index, id] of SEGMENT_IDS.entries()) {
    const result = prepareSegment(id, spoken[index], duration);
    buffers.push(result.pcm);
    segments.push(result.segment);
    duration = result.segment.end;
  }
  const pcm = Buffer.concat(buffers);
  ffmpeg(
    [
      '-f',
      's16le',
      '-ar',
      String(SAMPLE_RATE),
      '-ac',
      String(CHANNELS),
      '-i',
      'pipe:0',
      '-c:a',
      'pcm_s16le',
      file('narration.wav'),
    ],
    { input: pcm },
  );
  ffmpeg([
    '-i',
    file('narration.wav'),
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-movflags',
    '+faststart',
    file('narration.m4a'),
  ]);
  const timing = {
    version: 1,
    voice: 'ElevenLabs Brian (retained approved narration)',
    sampleRate: SAMPLE_RATE,
    channels: CHANNELS,
    duration,
    samples: pcm.length / BYTES_PER_SAMPLE,
    decodedPcmSha256: digest(pcm),
    narrationM4aSha256: digest(fs.readFileSync(file('narration.m4a'))),
    segments,
    words: segments.flatMap((s) => s.words),
    captions: segments.flatMap((s) => s.captions),
  };
  writeJson('timing.json', timing);
  fs.writeFileSync(
    file('metadata.js'),
    '/* Generated preview timing for file:// playback. Depends on retained Brian audio/alignment; used by preview.js. Regenerate with build-preview.cjs prepare. */\n' +
      `window.PREVIEW_TIMING = ${JSON.stringify({ duration: timing.duration, secondOffset: timing.segments[1].start, captions: timing.captions }, null, 2)};\n`,
  );
  fs.writeFileSync(
    file('captions.vtt'),
    `WEBVTT\n\n${timing.captions.map((cue) => `${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`).join('\n')}`,
  );
  fs.writeFileSync(
    file('transcript.md'),
    `# Animated style preview — approved Brian narration\n\n${segments.map((s, i) => `## ${i ? 'Cloud → contract → code' : 'One messy idea'}\n\n${s.spoken}`).join('\n\n')}\n`,
  );
  fs.writeFileSync(
    file('.gitignore'),
    'narration.wav\nrender-intermediate.mp4\nverification-frames/\nframes/\n',
  );
  return timing;
}

function assertSources(timing) {
  const paragraphs = canonicalParagraphs();
  for (const segment of timing.segments) {
    const actual = digest(fs.readFileSync(path.resolve(ROOT, segment.source)));
    if (actual !== segment.sha256)
      throw new Error(
        `Source audio ${segment.id} changed; run prepare and review before rendering.`,
      );
    if (digest(paragraphs[Number(segment.id) - 1]) !== segment.sourceTextSha256)
      throw new Error(
        `Canonical paragraph ${segment.id} changed; reconcile approved narration before rendering.`,
      );
  }
  if (digest(fs.readFileSync(file('narration.m4a'))) !== timing.narrationM4aSha256)
    throw new Error('Prepared AAC narration changed; run prepare before rendering.');
  const pcm = ffmpeg([
    '-i',
    file('narration.wav'),
    '-f',
    's16le',
    '-acodec',
    'pcm_s16le',
    'pipe:1',
  ]);
  if (digest(pcm) !== timing.decodedPcmSha256)
    throw new Error('Prepared narration changed; run prepare before rendering.');
}

function byteRange(value, size) {
  if (!value) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) throw new Error('Unsupported byte range');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  )
    throw new Error('Requested byte range is outside this file');
  return { start, end, partial: true };
}

function serveFile(request, response, target, contentType) {
  const size = fs.statSync(target).size;
  let range;
  try {
    range = byteRange(request.headers.range, size);
  } catch {
    response.writeHead(416, { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' });
    response.end();
    return;
  }
  const headers = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Content-Length': Math.max(0, range.end - range.start + 1),
    'Cache-Control': 'no-cache',
  };
  if (range.partial) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`;
  response.writeHead(range.partial ? 206 : 200, headers);
  if (request.method === 'HEAD' || size === 0) {
    response.end();
    return;
  }
  const stream = fs.createReadStream(target, { start: range.start, end: range.end });
  stream.on('error', (error) => {
    process.stderr.write(
      `Preview asset stream failed: ${error.message}. Check the asset exists and is readable.\n`,
    );
    response.destroy(error);
  });
  stream.pipe(response);
}

function previewServer() {
  const mime = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.m4a': 'audio/mp4',
    '.mp4': 'video/mp4',
    '.wav': 'audio/wav',
    '.vtt': 'text/vtt',
  };
  const server = http.createServer((request, response) => {
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end('Use GET or HEAD.');
        return;
      }
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const target = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (
        !target.startsWith(`${ROOT}${path.sep}`) ||
        !fs.existsSync(target) ||
        !fs.statSync(target).isFile()
      ) {
        response.writeHead(404);
        response.end('Preview asset not found.');
        return;
      }
      serveFile(
        request,
        response,
        target,
        mime[path.extname(target)] || 'application/octet-stream',
      );
    } catch (error) {
      response.writeHead(400);
      response.end(`Preview request failed: ${error.message}`);
    }
  });
  return server;
}

/** Serves only this preview directory with byte ranges for native media seeking. */
async function serve(port) {
  const server = previewServer();
  server.listen(port, '127.0.0.1');
  await once(server, 'listening');
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  return { status: 'ready', url: `http://127.0.0.1:${server.address().port}/`, byteRanges: true };
}

function encoder() {
  const process = spawn(
    FFMPEG,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
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
      String(FPS),
      '-movflags',
      '+faststart',
      file('render-intermediate.mp4'),
    ],
    { stdio: ['pipe', 'ignore', 'pipe'] },
  );
  let stderr = '';
  process.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const state = { error: null };
  process.stdin.on('error', (error) => {
    state.error = error;
  });
  const completed = new Promise((resolve) => {
    process.once('error', (error) => resolve({ error }));
    process.once('close', (code) =>
      resolve(
        code === 0
          ? {}
          : {
              error: new Error(
                `FFmpeg render failed (${code}): ${stderr}. Check free disk space and FFmpeg availability.`,
              ),
            },
      ),
    );
  });
  return { process, completed, state };
}

async function captureFrames(page, timing, output) {
  const frames = Math.ceil(timing.duration * FPS),
    checks = [];
  for (let frame = 0; frame < frames; frame += 1) {
    if (output.state.error) throw output.state.error;
    const time = frame / FPS;
    await page.evaluate(async (seconds) => {
      await window.renderAt(seconds);
    }, time);
    const bytes = await page.screenshot({
      type: 'jpeg',
      quality: 94,
      clip: { x: 0, y: 0, ...SIZE },
    });
    if (!output.process.stdin.write(bytes)) await once(output.process.stdin, 'drain');
    if (frame % (FPS * 3) === 0) checks.push({ time, sha256: digest(bytes) });
    if (frame % (FPS * 10) === 0)
      process.stderr.write(`Captured ${time.toFixed(0)} / ${timing.duration.toFixed(1)} seconds\n`);
  }
  output.process.stdin.end();
  const result = await output.completed;
  if (result.error) throw result.error;
  return { frames, checks };
}

function mux(timing) {
  ffmpeg([
    '-i',
    file('render-intermediate.mp4'),
    '-i',
    file('narration.m4a'),
    '-i',
    file('captions.vtt'),
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
    file('style-preview.mp4'),
  ]);
}

async function captureSession() {
  const server = previewServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const { chromium } = PROJECT_REQUIRE('playwright');
  let browser;
  const errors = [];
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1 });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) =>
      route.request().url().startsWith(`${origin}/`) ? route.continue() : route.abort(),
    );
    await page.goto(`${origin}/index.html?capture=1`, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
      if (typeof window.renderAt !== 'function')
        throw new Error(
          'Expected window.renderAt(seconds); implement deterministic rendering first.',
        );
    });
    const box = await page.locator('#stage').boundingBox();
    if (
      !box ||
      box.x !== 0 ||
      box.y !== 0 ||
      box.width !== SIZE.width ||
      box.height !== SIZE.height
    )
      throw new Error('Capture stage must be 1280×720 at (0,0); fix capture CSS before export.');
    return {
      page,
      errors,
      close: async () => {
        await browser.close();
        server.close();
      },
    };
  } catch (error) {
    if (browser) await browser.close();
    server.close();
    throw error;
  }
}

/** Saves representative deterministic frames for visual review before the MP4 render. */
async function stills() {
  const times = [7.95, 12.6, 20.8, 24.9, 26.8, 29.8, 33.7, 40.5, 45, 51, 56.8, 59.5, 67.5];
  fs.mkdirSync(file('frames'), { recursive: true });
  const session = await captureSession(),
    frames = [];
  try {
    for (const time of times) {
      await session.page.evaluate(async (seconds) => {
        await window.renderAt(seconds);
      }, time);
      const target = file(`frames/frame-${time.toFixed(2).padStart(5, '0')}.png`);
      await session.page.screenshot({ path: target, type: 'png', clip: { x: 0, y: 0, ...SIZE } });
      frames.push({ time, path: target });
    }
    if (session.errors.length)
      throw new Error(`Browser errors in stills: ${session.errors.join('; ')}`);
    fs.copyFileSync(frames[0].path, file('poster.png'));
    return { status: 'captured', frames, poster: file('poster.png') };
  } finally {
    await session.close();
  }
}

/** Renders HTML at exact frame times; returns verified video metadata and evidence. */
async function render() {
  const timing = JSON.parse(fs.readFileSync(file('timing.json'), 'utf8'));
  assertSources(timing);
  const session = await captureSession(),
    output = encoder(),
    started = Date.now();
  try {
    const frames = await captureFrames(session.page, timing, output);
    if (new Set(frames.checks.map((sample) => sample.sha256)).size < 6)
      throw new Error(
        'Too few distinct frames; check renderAt(seconds) before accepting this animation export.',
      );
    if (session.errors.length)
      throw new Error(`Browser errors during rendering: ${session.errors.join('; ')}`);
    mux(timing);
    const report = {
      ...verify(),
      renderSeconds: (Date.now() - started) / 1000,
      renderer: 'Deterministic HTML frames at 30 fps; no still-image zoom substitution',
      capturedFrames: frames.frames,
      sampledFrameHashes: frames.checks,
      browserErrors: session.errors,
    };
    writeJson('render-report.json', report);
    return report;
  } finally {
    output.process.stdin.destroy();
    output.process.kill();
    await session.close();
  }
}

/** Fully decodes the export and checks audio provenance, format, timing and subtitle streams. */
function verify() {
  const timing = JSON.parse(fs.readFileSync(file('timing.json'), 'utf8'));
  assertSources(timing);
  const target = file('style-preview.mp4'),
    metadata = probe(target);
  const video = metadata.streams.find((stream) => stream.codec_type === 'video');
  const audio = metadata.streams.find((stream) => stream.codec_type === 'audio');
  const subtitles = metadata.streams.find((stream) => stream.codec_type === 'subtitle');
  if (
    !video ||
    video.codec_name !== 'h264' ||
    video.width !== SIZE.width ||
    video.height !== SIZE.height ||
    video.r_frame_rate !== '30/1'
  )
    throw new Error('Unexpected video format; rerun render after checking encoder.');
  if (!audio || audio.codec_name !== 'aac' || !subtitles || subtitles.codec_name !== 'mov_text')
    throw new Error('Narration or subtitle track missing; rerun render.');
  if (Math.abs(Number(metadata.format.duration) - timing.duration) > 0.1)
    throw new Error(
      'Video duration does not match retained narration; inspect render and mux timing.',
    );
  ffmpeg(['-i', target, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
  return {
    status: 'verified',
    duration: Number(metadata.format.duration),
    expectedAudioDuration: timing.duration,
    video: { codec: video.codec_name, ...SIZE, fps: FPS },
    audio: { codec: audio.codec_name, sampleRate: audio.sample_rate, channels: audio.channels },
    captions: subtitles.codec_name,
    originalAudioHashesMatched: true,
    decodedNarrationHashMatched: true,
    fullDecode: 'passed',
    bytes: fs.statSync(target).size,
    sha256: digest(fs.readFileSync(target)),
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || !args.length) {
    process.stdout.write(
      'Usage: node course/style-preview/build-preview.cjs <prepare|stills|render|verify|serve> [--json] [--port 4175]\nprepare reuses approved Brian audio and writes timing.json, metadata.js and captions; stills saves PNGs and poster for visual QA; render captures index.html at 30fps; verify fully decodes the MP4; serve binds only 127.0.0.1 with byte-range support. --port applies only to serve. All operations are offline.\n',
    );
    return;
  }
  const mode = args[0];
  if (!['prepare', 'stills', 'render', 'verify', 'serve'].includes(mode))
    throw new Error('Unknown operation; run with --help for supported operations.');
  let port = 4175;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--json') continue;
    if (args[index] === '--port' && mode === 'serve') {
      port = Number(args[++index]);
      continue;
    }
    throw new Error('Unknown arguments; run with --help for supported operations.');
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Port must be an integer from 1024 to 65535.');
  const result =
    mode === 'stills'
      ? await stills()
      : mode === 'prepare'
        ? prepare()
        : mode === 'render'
          ? await render()
          : mode === 'serve'
            ? await serve(port)
            : verify();
  process.stdout.write(`${JSON.stringify(result, null, args.includes('--json') ? 2 : 0)}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `Style preview build failed: ${error.message}\nRun --help, restore missing inputs, or inspect the named stage before retrying.\n`,
  );
  process.exitCode = 1;
});
