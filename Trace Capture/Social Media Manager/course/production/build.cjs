#!/usr/bin/env node
/** Produce lesson presentations and video from the approved lecture and Brian audio.
 * Audio requests are journaled before dispatch; ambiguous requests must be reconciled manually.
 * Rendering uses retained audio, HTML scene source, FFmpeg, and the project's Playwright installation.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');

const course = path.resolve(__dirname, '..');
const projectRequire = createRequire(path.resolve(__dirname, '../../../../package.json'));
const lesson = process.argv[2];
const mode = process.argv[3] || 'render';
if (!/^(0[2-9]|10)$/.test(lesson || '') || !['prepare', 'synthesize', 'render', 'all'].includes(mode)) {
  console.error('Usage: node course/production/build.cjs <02..10> <prepare|synthesize|render|all>');
  process.exit(2);
}
const root = path.join(course, 'productions', lesson);
const scriptPath = path.join(course, 'lessons', `${lesson}.html`);
const ffp = process.env.FFPROBE_PATH || 'ffprobe';
const ffm = process.env.FFMPEG_PATH || 'ffmpeg';
const digest = (s) => crypto.createHash('sha256').update(s).digest('hex');
const ensure = (p) => fs.mkdirSync(p, { recursive: true });
const file = (...p) => path.join(root, ...p);
function writeJson(p, obj) { fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`); }
function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function getScenes() {
  const h = fs.readFileSync(scriptPath, 'utf8');
  const m = h.match(/<article[^>]*id="lecture-script"[^>]*>([\s\S]*?)<\/article>/i);
  if (!m) throw new Error(`Lecture missing in ${scriptPath}`);
  const paragraphs = [...m[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)]
    .map((x) => decode(x[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()));
  const visuals = JSON.parse(fs.readFileSync(path.join(course, 'scene-design', 'scenes.json'), 'utf8'))[lesson];
  if (!Array.isArray(visuals) || visuals.length !== paragraphs.length) throw new Error(`Scene design count mismatch for ${lesson}: ${visuals?.length} vs ${paragraphs.length}`);
  return paragraphs.map((spoken, i) => {
    const v = visuals[i];
    if (!v.title || !v.visual || !Array.isArray(v.points) || v.points.length !== 3) throw new Error(`Invalid visual ${lesson}/${i + 1}`);
    return { id: String(i + 1).padStart(2, '0'), title: v.title, visual: v.visual, points: v.points, spoken };
  });
}
function prepare(scenes) {
  ensure(root);
  for (const dir of ['audio', 'alignment', 'captions', 'journal', 'frames', 'segments']) ensure(file(dir));
  fs.writeFileSync(file('.gitignore'), 'frames/\nsegments/\n');
  const pilot = fs.readFileSync(path.join(course, 'pilot', 'presentation.html'), 'utf8');
  const lessonTitle = decode(fs.readFileSync(scriptPath, 'utf8').match(/<title>\d+ · (.*?) \|/)[1]);
  const html = pilot.replaceAll('Lesson 1 · The whole system', `Lesson ${Number(lesson)} · ${lessonTitle}`)
    .replaceAll('Lesson 01 / The whole system', `Lesson ${lesson} / ${lessonTitle}`)
    .replaceAll('THE WHOLE SYSTEM', lessonTitle.toUpperCase())
    .replaceAll('../lessons/01.html', `../../lessons/${lesson}.html`);
  fs.writeFileSync(file('presentation.html'), html);
  fs.writeFileSync(file('scene-data.js'), `window.PILOT_SCENES = ${JSON.stringify(scenes.map(({ spoken, ...rest }) => rest), null, 2)};\n`);
  fs.writeFileSync(file('transcript.md'), `# Lesson ${Number(lesson)} transcript: ${lessonTitle}\n\n${scenes.map((s) => `## ${s.title}\n\n${s.spoken}`).join('\n\n')}\n`);
  console.log(`Prepared lesson ${lesson}: ${scenes.length} scenes, ${scenes.reduce((n, s) => n + s.spoken.length, 0)} narration characters.`);
}
function key() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  const env = fs.readFileSync(path.join(process.env.HOME, 'ShortFactoryClaude', '.env'), 'utf8');
  const line = env.split(/\r?\n/).find((x) => /^\s*FAL_KEY\s*=/.test(x));
  if (!line) throw new Error('Existing voice credential unavailable.');
  return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
}
function words(chunks) {
  if (!Array.isArray(chunks)) return [];
  let offset = 0, last = 0, word = '', start = 0, end = 0, result = [];
  const flush = () => { if (word.trim()) result.push({ text: word.trim(), start, end }); word = ''; };
  for (const c of chunks) {
    const chars = c.characters || c.chars || [], starts = c.character_start_times_seconds || c.character_start_times || [], ends = c.character_end_times_seconds || c.character_end_times || [];
    if (!chars.length || starts.length !== chars.length || ends.length !== chars.length) continue;
    if (Number(starts[0]) + offset < last - .01) offset = last;
    chars.forEach((ch, i) => { const a = Number(starts[i]) + offset, b = Number(ends[i]) + offset; if (/\s/.test(ch)) flush(); else { if (!word) start = a; word += ch; end = b; } last = Math.max(last, b); });
  }
  flush(); return result;
}
function cueGroups(ws) {
  const result = []; let group = [];
  const flush = () => { if (group.length) result.push({ start: group[0].start, end: group[group.length - 1].end, text: group.map((x) => x.text).join(' ') }); group = []; };
  for (const w of ws) { if (group.length && (group.map((x) => x.text).join(' ').length + w.text.length + 1 > 58 || w.end - group[0].start > 5)) flush(); group.push(w); if (/[.!?]$/.test(w.text)) flush(); }
  flush(); return result;
}
function ts(seconds) { const n = Math.max(0, Math.round(seconds * 1000)); return `${String(Math.floor(n / 3600000)).padStart(2, '0')}:${String(Math.floor(n / 60000) % 60).padStart(2, '0')}:${String(Math.floor(n / 1000) % 60).padStart(2, '0')}.${String(n % 1000).padStart(3, '0')}`; }
function vtt(cues) { return `WEBVTT\n\n${cues.map((c) => `${ts(c.start)} --> ${ts(Math.max(c.end, c.start + .2))}\n${c.text}\n`).join('\n')}`; }
function textNorm(value) { return value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, ''); }
async function synthesize(scenes) {
  const secret = key();
  for (const s of scenes) {
    const audio = file('audio', `${s.id}.mp3`), alignment = file('alignment', `${s.id}.json`), journal = file('journal', `${s.id}.json`), sub = file('captions', `${s.id}.vtt`);
    if (fs.existsSync(journal)) {
      const prior = JSON.parse(fs.readFileSync(journal, 'utf8'));
      if (prior.status !== 'complete') throw new Error(`Uncertain previous request ${lesson}/${s.id}; reconcile it before retrying.`);
      if (prior.sourceSha256 !== digest(s.spoken) || !fs.existsSync(audio) || !fs.existsSync(alignment) || !fs.existsSync(sub)) throw new Error(`Retained files/source mismatch ${lesson}/${s.id}; reconcile.`);
      console.log(`Retained ${lesson}/${s.id}`); continue;
    }
    if (fs.existsSync(audio) || fs.existsSync(alignment) || fs.existsSync(sub)) throw new Error(`Unjournaled partial result ${lesson}/${s.id}; reconcile.`);
    writeJson(journal, { status: 'dispatched', lesson, scene: s.id, sourceSha256: digest(s.spoken), started: new Date().toISOString() });
    console.log(`Requesting Brian for ${lesson}/${s.id}: ${s.spoken.length} characters`);
    const response = await fetch('https://fal.run/fal-ai/elevenlabs/tts/multilingual-v2', { method: 'POST', headers: { Authorization: `Key ${secret}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: s.spoken, voice: 'Brian', timestamps: true, stability: .5, similarity_boost: .8, style: .15 }), signal: AbortSignal.timeout(180000) });
    if (!response.ok) throw new Error(`Provider returned HTTP ${response.status} on ${lesson}/${s.id}; reconcile journal before retry.`);
    const data = await response.json();
    if (!data.audio?.url || new URL(data.audio.url).protocol !== 'https:') throw new Error(`No valid audio URL on ${lesson}/${s.id}; reconcile.`);
    const ws = words(data.timestamps);
    if (!ws.length || textNorm(ws.map((w) => w.text).join(' ')) !== textNorm(s.spoken)) throw new Error(`Provider alignment mismatch on ${lesson}/${s.id}; reconcile.`);
    const downloaded = await fetch(data.audio.url, { signal: AbortSignal.timeout(120000) });
    if (!downloaded.ok) throw new Error(`Audio download HTTP ${downloaded.status} on ${lesson}/${s.id}; reconcile.`);
    const bytes = Buffer.from(await downloaded.arrayBuffer()); if (bytes.length < 1000) throw new Error(`Empty audio on ${lesson}/${s.id}; reconcile.`);
    fs.writeFileSync(audio, bytes);
    writeJson(alignment, { sourceSha256: digest(s.spoken), timestamps: data.timestamps });
    fs.writeFileSync(sub, vtt(cueGroups(ws)));
    writeJson(journal, { status: 'complete', lesson, scene: s.id, sourceSha256: digest(s.spoken), completed: new Date().toISOString(), chars: s.spoken.length, charge: 'not exposed' });
  }
}
function probe(p) { return Number(execFileSync(ffp, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', p], { encoding: 'utf8' }).trim()); }
async function render(scenes) {
  for (const s of scenes) {
    const paths = ['audio/' + s.id + '.mp3', 'alignment/' + s.id + '.json', 'captions/' + s.id + '.vtt', 'journal/' + s.id + '.json'];
    if (paths.some((p) => !fs.existsSync(file(p)))) throw new Error(`Missing retained audio/alignment/captions/journal for ${lesson}/${s.id}`);
    const prior = JSON.parse(fs.readFileSync(file('journal', `${s.id}.json`), 'utf8'));
    if (prior.status !== 'complete' || prior.sourceSha256 !== digest(s.spoken)) throw new Error(`Source or receipt mismatch for ${lesson}/${s.id}`);
  }
  const { chromium } = projectRequire('playwright'); const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  let offset = 0; const allCues = [], manifest = [];
  try {
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i], audio = file('audio', `${s.id}.mp3`), frame = file('frames', `${s.id}.png`), segment = file('segments', `${s.id}.mp4`);
      const duration = probe(audio); if (!Number.isFinite(duration) || duration < 1) throw new Error(`Bad duration ${lesson}/${s.id}`);
      await page.goto(`${pathToFileURL(file('presentation.html')).href}?scene=${i}&capture=1`, { waitUntil: 'load' }); await page.screenshot({ path: frame });
      const align = JSON.parse(fs.readFileSync(file('alignment', `${s.id}.json`), 'utf8'));
      const cues = cueGroups(words(align.timestamps)); if (!cues.length) throw new Error(`Missing cues ${lesson}/${s.id}`);
      allCues.push(...cues.map((c) => ({ ...c, start: c.start + offset, end: c.end + offset })));
      const count = Math.ceil(duration * 15);
      execFileSync(ffm, ['-hide_banner', '-loglevel', 'error', '-y', '-loop', '1', '-framerate', '15', '-i', frame, '-i', audio, '-vf', `scale=1400:788,zoompan=z='min(zoom+0.00015,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${count}:s=1280x720:fps=15,format=yuv420p`, '-t', String(duration), '-c:v', 'h264_videotoolbox', '-b:v', '650k', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', segment], { stdio: 'inherit' });
      const actual = probe(segment); manifest.push({ id: s.id, title: s.title, narrationSegmentId: s.id, startMs: Math.round(offset * 1000), endMs: Math.round((offset + actual) * 1000), audio: `audio/${s.id}.mp3`, accessibleDescription: s.visual }); offset += actual;
      console.log(`Rendered ${lesson}/${s.id} (${actual.toFixed(1)}s)`);
    }
  } finally { await browser.close(); }
  fs.writeFileSync(file('captions.vtt'), vtt(allCues));
  writeJson(file('cues.json'), { version: 1, lesson, generatedFrom: `../../lessons/${lesson}.html#lecture-script`, scenes: manifest });
  fs.writeFileSync(file('segments', 'concat.txt'), scenes.map((s) => `file '${s.id}.mp4'`).join('\n') + '\n');
  const assembled = file('segments', 'assembled.mp4'), output = file(`lesson-${lesson}.mp4`);
  execFileSync(ffm, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', file('segments', 'concat.txt'), '-c', 'copy', assembled], { stdio: 'inherit' });
  execFileSync(ffm, ['-hide_banner', '-loglevel', 'error', '-y', '-i', assembled, '-i', file('captions.vtt'), '-map', '0:v:0', '-map', '0:a:0', '-map', '1:0', '-c:v', 'copy', '-c:a', 'copy', '-c:s', 'mov_text', '-metadata:s:s:0', 'language=eng', '-movflags', '+faststart', output], { stdio: 'inherit' });
  console.log(`Completed ${lesson}: ${probe(output).toFixed(2)} seconds, ${fs.statSync(output).size} bytes.`);
}
async function main() { const scenes = getScenes(); prepare(scenes); if (mode === 'synthesize' || mode === 'all') await synthesize(scenes); if (mode === 'render' || mode === 'all') await render(scenes); }
main().catch((e) => { console.error(`Lesson ${lesson} stopped: ${e.message}`); process.exitCode = 1; });
