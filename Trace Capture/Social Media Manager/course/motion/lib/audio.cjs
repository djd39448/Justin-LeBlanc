/**
 * Prepares retained Brian narration, exact sample timing and phrase-anchored visual data.
 * Dependencies: common.cjs process/filesystem adapters; canonical lesson text and provider alignments.
 * Consumed by: build-course.cjs prepare; render and verification read the resulting manifests.
 * Why: narration stays unchanged while visual cues attach to words that were actually spoken.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const c = require('./common.cjs');
const KINDS = new Set([
  'approved-opening',
  'conversation',
  'flow',
  'comparison',
  'document',
  'evidence',
  'routing',
  'meter',
  'checkpoint',
  'example',
  'sequence',
]);
function alignedWords(chunks) {
  if (!Array.isArray(chunks) || !chunks.length)
    throw new Error('Missing speech alignment; restore retained provider timestamps.');
  const words = [];
  let text = '',
    start = 0,
    end = 0,
    offset = 0,
    last = 0;
  const flush = () => {
    if (text.trim()) words.push({ text: text.trim(), start, end });
    text = '';
  };
  for (const chunk of chunks) {
    const chars = chunk.characters,
      starts = chunk.character_start_times_seconds,
      ends = chunk.character_end_times_seconds;
    if (
      !chars ||
      !starts ||
      !ends ||
      chars.length !== starts.length ||
      chars.length !== ends.length
    )
      throw new Error('Invalid character alignment; restore matching retained timestamps.');
    if (Number(starts[0]) + offset < last - 0.01) offset = last;
    chars.forEach((character, i) => {
      const a = Number(starts[i]) + offset,
        b = Number(ends[i]) + offset;
      if (!Number.isFinite(a) || !Number.isFinite(b) || b < a)
        throw new Error('Invalid alignment time; inspect original timestamps.');
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
const tokens = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
function anchorTime(words, anchor, after, context) {
  if (typeof anchor !== 'string' || tokens(anchor).length < 2)
    throw new Error(`${context}: anchor must be a recognizable spoken phrase.`);
  const haystack = words.flatMap((w) => tokens(w.text).map((text) => ({ text, at: w.start }))),
    needle = tokens(anchor);
  const found = [];
  for (let i = 0; i <= haystack.length - needle.length; i++)
    if (needle.every((text, j) => text === haystack[i + j].text)) found.push(haystack[i].at);
  const at = found.find((time) => time >= after - 0.001);
  if (at === undefined)
    throw new Error(
      `${context}: missing or out-of-order anchor "${anchor}" after${after.toFixed(3)}s. Correct the storyboard phrase, not the narration.`,
    );
  return at;
}
function compileScene(scene, segment, lesson) {
  const context = `${lesson}/${segment.id}`;
  if (
    scene.id !== segment.id ||
    !KINDS.has(scene.kind) ||
    !['paper', 'teal', 'ink'].includes(scene.tone)
  )
    throw new Error(`${context}: invalid storyboard identity, kind or tone.`);
  if (!scene.title || !scene.intro || !Array.isArray(scene.items))
    throw new Error(`${context}: title, intro and items are required.`);
  if (scene.kind === 'approved-opening') {
    if (lesson !== '01' || Number(scene.id) > 2)
      throw new Error(`${context}: approved-opening belongs only to first two Lesson1 paragraphs.`);
    return { ...scene, start: segment.start, end: segment.end, duration: segment.duration };
  }
  if (scene.items.length < 3 || scene.items.length > 6)
    throw new Error(`${context}: storyboard needs3–6 meaningful visual cues.`);
  let last = 0;
  const items = scene.items.map((item, i) => {
    if (!item.label || typeof item.detail !== 'string')
      throw new Error(`${context}/${i}: visual label/detail missing.`);
    const at = anchorTime(segment.words, item.anchor, last, `${context}/item${i + 1}`);
    last = at;
    if (
      item.value !== undefined &&
      (!Number.isFinite(item.value) || item.value < 0 || item.value > 100)
    )
      throw new Error(`${context}: meter value must be0..100.`);
    return { ...item, at };
  });
  if (!scene.conclusion || !scene.conclusion.text)
    throw new Error(`${context}: conclusion text/anchor required.`);
  let calloutTime = 0;
  const callouts = (scene.callouts || []).map((callout, index) => {
    if (typeof callout.text !== 'string' || !callout.text.trim())
      throw new Error(`${context}/callout${index + 1}: explanatory text is required.`);
    const at = anchorTime(
      segment.words,
      callout.anchor,
      calloutTime,
      `${context}/callout${index + 1}`,
    );
    calloutTime = at;
    return { ...callout, at };
  });
  const at = anchorTime(segment.words, scene.conclusion.anchor, last, `${context}/conclusion`);
  return {
    ...scene,
    start: segment.start,
    end: segment.end,
    duration: segment.duration,
    items,
    callouts,
    conclusion: { ...scene.conclusion, at },
  };
}
function seconds(value) {
  const [h, m, s] = value.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}
function timestamp(value) {
  const n = Math.round(value * 1000),
    pad = (v, length = 2) => String(v).padStart(length, '0');
  return `${pad(Math.floor(n / 3600000))}:${pad(Math.floor(n / 60000) % 60)}:${pad(Math.floor(n / 1000) % 60)}.${pad(n % 1000, 3)}`;
}
function readCaptions(root, id, offset) {
  const vtt = c.fs.readFileSync(c.path.join(root, `captions/${id}.vtt`), 'utf8');
  const pattern =
    /(\d{2}:\d{2}:\d{2}\.\d{3}) --> (\d{2}:\d{2}:\d{2}\.\d{3})\n([^\n]+(?:\n[^\n]+)?)/g;
  const cues = [...vtt.matchAll(pattern)].map((m) => ({
    start: seconds(m[1]) + offset,
    end: seconds(m[2]) + offset,
    text: m[3],
  }));
  if (!cues.length) throw new Error(`No captions for${root}/${id}; restore retained VTT.`);
  return cues;
}
function prepareSegment(root, id, spoken, start) {
  const input = c.path.join(root, `audio/${id}.mp3`),
    align = c.readJson(c.path.join(root, `alignment/${id}.json`));
  if (c.digest(spoken) !== align.sourceSha256)
    throw new Error(
      `Script/alignment mismatch at${input}; reconcile approved text before visual production.`,
    );
  const pcm = c.ffmpeg([
    '-i',
    input,
    '-f',
    's16le',
    '-acodec',
    'pcm_s16le',
    '-ar',
    String(c.SAMPLE_RATE),
    '-ac',
    '1',
    'pipe:1',
  ]);
  const samples = pcm.length / 2,
    duration = samples / c.SAMPLE_RATE,
    words = alignedWords(align.timestamps);
  if (
    !Number.isInteger(samples) ||
    samples < c.SAMPLE_RATE ||
    tokens(words.map((w) => w.text).join(' ')).join(' ') !== tokens(spoken).join(' ')
  )
    throw new Error(`Invalid audio or spoken alignment at${input}; restore the retained source.`);
  return {
    pcm,
    segment: {
      id,
      source: c.relative(input),
      sha256: c.digest(c.fs.readFileSync(input)),
      sourceTextSha256: align.sourceSha256,
      start,
      end: start + duration,
      duration,
      samples,
      words,
      spoken,
      captions: readCaptions(root, id, start),
    },
  };
}
function saveAudio(root, pcm) {
  const temporary = c.path.join(root, '.motion-work');
  c.fs.mkdirSync(temporary, { recursive: true });
  const wav = c.path.join(temporary, 'narration.wav'),
    m4a = c.path.join(temporary, 'narration.m4a');
  c.ffmpeg(
    [
      '-f',
      's16le',
      '-ar',
      String(c.SAMPLE_RATE),
      '-ac',
      '1',
      '-i',
      'pipe:0',
      '-c:a',
      'pcm_s16le',
      wav,
    ],
    { input: pcm },
  );
  c.ffmpeg(['-i', wav, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', m4a]);
  c.fs.renameSync(m4a, c.path.join(root, 'narration.m4a'));
  const ignore = c.path.join(root, '.gitignore'),
    old = c.fs.existsSync(ignore) ? c.fs.readFileSync(ignore, 'utf8') : '';
  if (!old.includes('.motion-work/'))
    c.fs.writeFileSync(
      ignore,
      old + (old.endsWith('\n') ? '' : '\n') + '.motion-work/\nmotion-frames/\n',
    );
}
/** Prepares one lesson's unchanged audio and compiled browser cue data. Returns a compact summary. */
function prepare(lesson) {
  c.assertBaseline();
  const root = c.lessonDirectory(lesson),
    text = c.paragraphs(lesson),
    board = c.readJson(c.path.join(c.MOTION, `storyboards/${lesson}.json`));
  if (board.lesson !== lesson || board.scenes.length !== text.length || text.length !== 13)
    throw new Error(`Lesson${lesson}: expected13 matching narration/storyboard sections.`);
  const buffers = [],
    segments = [];
  let duration = 0;
  for (let i = 0; i < text.length; i++) {
    const result = prepareSegment(root, String(i + 1).padStart(2, '0'), text[i], duration);
    buffers.push(result.pcm);
    segments.push(result.segment);
    duration = result.segment.end;
  }
  const scenes = board.scenes.map((scene, i) => compileScene(scene, segments[i], lesson));
  const pcm = Buffer.concat(buffers),
    captions = segments.flatMap((s) => s.captions);
  saveAudio(root, pcm);
  const timing = {
    version: 2,
    lesson,
    voice: 'ElevenLabs Brian (unchanged retained recordings)',
    sampleRate: c.SAMPLE_RATE,
    channels: 1,
    duration,
    samples: pcm.length / 2,
    decodedPcmSha256: c.digest(pcm),
    narrationM4aSha256: c.digest(c.fs.readFileSync(c.path.join(root, 'narration.m4a'))),
    segments,
    captions,
  };
  c.writeJson(c.path.join(root, 'timing.json'), timing);
  const title = c
    .readJson(c.path.join(c.COURSE, 'curriculum.json'))
    .lessons.find((l) => l.id === lesson).title;
  const data = { lesson, title, duration, scenes, captions };
  c.fs.writeFileSync(
    c.path.join(root, 'presentation-data.js'),
    '/* Generated phrase-aligned visual data. Depends on unchanged Brian audio and motion/storyboards; consumed by motion/player.js. Regenerate with build-course.cjs prepare. */\nwindow.COURSE_DATA = ' +
      JSON.stringify(data, null, 2) +
      ';\n',
  );
  c.fs.writeFileSync(
    c.path.join(root, 'captions.vtt'),
    'WEBVTT\n\n' +
      captions
        .map((cue) => `${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`)
        .join('\n'),
  );
  c.writeJson(c.path.join(root, 'cues.json'), {
    version: 2,
    lesson,
    generatedFrom:
      lesson === '01'
        ? '../lessons/01.html#lecture-script'
        : `../../lessons/${lesson}.html#lecture-script`,
    scenes: scenes.map((s) => ({
      id: s.id,
      title: s.title,
      narrationSegmentId: s.id,
      startMs: Math.round(s.start * 1000),
      endMs: Math.round(s.end * 1000),
      audio: `audio/${s.id}.mp3`,
      accessibleDescription: s.intro,
    })),
  });
  return {
    lesson,
    status: 'prepared',
    duration,
    scenes: scenes.length,
    anchoredReveals: scenes.reduce((n, s) => n + s.items.length, 0),
    audioClipsUnchanged: 13,
  };
}
/** Checks prepared audio and current text against retained sources before rendering. */
function assertPrepared(lesson, timing) {
  c.assertBaseline();
  const texts = c.paragraphs(lesson),
    root = c.lessonDirectory(lesson);
  for (const segment of timing.segments) {
    if (
      c.digest(c.fs.readFileSync(c.path.join(c.COURSE, segment.source))) !== segment.sha256 ||
      c.digest(texts[Number(segment.id) - 1]) !== segment.sourceTextSha256
    )
      throw new Error(
        `Lesson${lesson}/${segment.id}: source audio/text changed; reconcile before rendering.`,
      );
  }
  if (c.digest(c.fs.readFileSync(c.path.join(root, 'narration.m4a'))) !== timing.narrationM4aSha256)
    throw new Error(`Lesson${lesson}: prepared narration differs; rerun prepare.`);
  const wav = c.path.join(root, '.motion-work/narration.wav');
  if (c.fs.existsSync(wav)) {
    const pcm = c.ffmpeg(['-i', wav, '-f', 's16le', '-acodec', 'pcm_s16le', 'pipe:1']);
    if (c.digest(pcm) !== timing.decodedPcmSha256)
      throw new Error(`Lesson${lesson}: prepared PCM differs; rerun prepare.`);
  }
}
module.exports = { prepare, assertPrepared, compileScene, alignedWords, anchorTime };
