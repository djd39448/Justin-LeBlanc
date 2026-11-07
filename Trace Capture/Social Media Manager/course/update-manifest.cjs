#!/usr/bin/env node
/** Reconcile the course catalog with completed local media and emit a file://-safe browser copy. */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline catalog tooling uses CommonJS. */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { sourceFingerprint } = require('./motion/lib/common.cjs');

const root = __dirname;
const manifestPath = path.join(root, 'curriculum.json');
const browserPath = path.join(root, 'curriculum.js');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const summaries = [
  'Understand the two loops',
  'Get to “yes, that’s what I mean”',
  'Separate truth from assumptions',
  'Make the invisible system visible',
  'Give your project a memory',
  'Turn a design into a contract',
  'Know what “done” really means',
  'Direct agents deliberately',
  'Keep long work restartable',
  'Put the whole system to work',
];
const digest = (text) => crypto.createHash('sha256').update(text).digest('hex');
const decode = (text) =>
  text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
const exists = (relative) => fs.existsSync(path.join(root, relative));
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

function lessonParagraphs(relative) {
  const html = fs.readFileSync(path.join(root, relative), 'utf8');
  const article = html.match(/<article[^>]*id="lecture-script"[^>]*>([\s\S]*?)<\/article>/i);
  if (!article) throw new Error(`Lecture script not found: ${relative}`);
  return [...article[1].matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map((part) =>
    decode(
      part[1]
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    ),
  );
}

function inspectProduction(lesson, paragraphs) {
  const dir = lesson.id === '01' ? 'pilot' : `productions/${lesson.id}`;
  const paths = {
    presentation: `${dir}/presentation.html`,
    video: `${dir}/lesson-${lesson.id}.mp4`,
    captions: `${dir}/captions.vtt`,
    transcript: `${dir}/transcript.md`,
    cues: `${dir}/cues.json`,
    storyboard: `motion/storyboards/${lesson.id}.json`,
    visualRuntime: 'motion/visuals.js',
    productionTool: 'motion/build-course.cjs',
    timing: `${dir}/timing.json`,
    renderEvidence: `${dir}/render-report.json`,
    poster: `${dir}/poster.png`,
  };
  try {
    if (Object.values(paths).some((file) => !exists(file))) return null;
    const report = readJson(paths.renderEvidence);
    if (report.status !== 'verified' || report.lesson !== lesson.id) return null;
    if (report.sourceFingerprint.sha256 !== sourceFingerprint(lesson.id).sha256) return null;
    if (report.sha256 !== digest(fs.readFileSync(path.join(root, paths.video)))) return null;
    const cues = readJson(paths.cues);
    if (
      cues.lesson !== lesson.id ||
      !Array.isArray(cues.scenes) ||
      cues.scenes.length !== paragraphs.length ||
      !paragraphs.length
    )
      return null;
    let endMs = 0;
    for (let i = 0; i < cues.scenes.length; i++) {
      const scene = cues.scenes[i];
      const sceneId = String(i + 1).padStart(2, '0');
      if (
        scene.id !== sceneId ||
        scene.startMs !== endMs ||
        !Number.isFinite(scene.endMs) ||
        scene.endMs <= scene.startMs
      )
        return null;
      endMs = scene.endMs;
      const audio = `${dir}/audio/${sceneId}.mp3`;
      const alignment = `${dir}/alignment/${sceneId}.json`;
      const caption = `${dir}/captions/${sceneId}.vtt`;
      if (![audio, alignment, caption].every(exists)) return null;
      const sha = digest(paragraphs[i]);
      if (readJson(alignment).sourceSha256 !== sha) return null;
      if (lesson.id !== '01') {
        const receipt = readJson(`${dir}/journal/${sceneId}.json`);
        if (
          receipt.status !== 'complete' ||
          receipt.lesson !== lesson.id ||
          receipt.scene !== sceneId ||
          receipt.sourceSha256 !== sha
        )
          return null;
      }
    }
    const probe = spawnSync(
      process.env.FFPROBE_PATH || 'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=codec_type',
        '-of',
        'json',
        path.join(root, paths.video),
      ],
      { encoding: 'utf8' },
    );
    if (probe.status !== 0) return null;
    const data = JSON.parse(probe.stdout);
    const durationSeconds = Number(data.format?.duration);
    const kinds = new Set(data.streams?.map((stream) => stream.codec_type));
    if (
      !Number.isFinite(durationSeconds) ||
      Math.abs(durationSeconds * 1000 - endMs) > 1500 ||
      !kinds.has('video') ||
      !kinds.has('audio') ||
      !kinds.has('subtitle')
    )
      return null;
    if (!fs.readFileSync(path.join(root, paths.captions), 'utf8').startsWith('WEBVTT')) return null;
    return {
      ...paths,
      durationSeconds: Math.round(durationSeconds * 1000) / 1000,
      sceneCount: cues.scenes.length,
    };
  } catch {
    // A producer may still be writing a receipt or muxing a video. Retry reconciliation after it finishes.
    return null;
  }
}

if (!Array.isArray(manifest.lessons) || manifest.lessons.length !== 10)
  throw new Error('Expected ten lessons in curriculum.json');
const ids = new Set();
manifest.lessons = manifest.lessons.map((lesson, index) => {
  const expectedId = String(index + 1).padStart(2, '0');
  if (
    lesson.id !== expectedId ||
    lesson.order !== index + 1 ||
    ids.has(lesson.id) ||
    lesson.source !== `lessons/${lesson.id}.html`
  )
    throw new Error(`Invalid lesson order or source: ${lesson.id}`);
  ids.add(lesson.id);
  const paragraphs = lessonParagraphs(lesson.source);
  const media = inspectProduction(lesson, paragraphs);
  const materials = {
    lessonPlan: `${lesson.source}#plan`,
    lectureScript: `${lesson.source}#lecture-script`,
    exercise: `${lesson.source}#exercise`,
    workedExampleAndRubric: lesson.source,
    lessonTextSources:
      lesson.id === '01'
        ? [lesson.source]
        : ['lessons/lesson-source.mjs', 'lessons/deep-dives.mjs', 'lessons/sample-answers.mjs'],
    sceneSource: `motion/storyboards/${lesson.id}.json`,
    ...(media || {}),
  };
  return {
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    objective: lesson.objective,
    summary: lesson.summary || summaries[index],
    prerequisites: index ? [String(index).padStart(2, '0')] : [],
    estimatedPractice:
      lesson.id === '10' ? '2–4 hours, depending on project and prior work' : '15–20 minutes',
    source: lesson.source,
    status: {
      lesson: 'course content accepted; human beginner validation pending',
      media: media
        ? 'animated HTML and video produced locally; detailed caption review pending'
        : 'not yet verified complete',
      ownerReview: 'course and narration accepted; animated visual style approved 2026-11-07',
      access: 'not protected; host access integration not configured',
    },
    materials,
  };
});
manifest.schemaVersion = 2;
manifest.lessonDefaults = {
  rightsStatus:
    'fal states commercial use is permitted; applicable account and voice terms remain to be confirmed before launch',
  accessStatus: 'not protected; host access integration not configured',
};
const json = `${JSON.stringify(manifest, null, 2)}\n`;
fs.writeFileSync(manifestPath, json);
fs.writeFileSync(
  browserPath,
  `/* Generated by update-manifest.cjs; edit curriculum.json and rerun instead. */\nwindow.COURSE_CURRICULUM = ${JSON.stringify(manifest, null, 2)};\n`,
);
process.stdout.write(
  `Updated ${manifest.lessons.length} lessons; ${manifest.lessons.filter((lesson) => lesson.materials.video).length} have complete local media.\n`,
);
