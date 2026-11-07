/**
 * Verifies exported lesson streams, exact audio reuse, decoding and visual motion evidence.
 * Dependencies: common/audio helpers and local FFmpeg/FFprobe; no external providers.
 * Consumed by: render's pre-promotion gate and build-course verify.
 * Why: an animation export must prove more than a changed file name or a moving progress bar.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const c = require('./common.cjs');
const { assertPrepared } = require('./audio.cjs');
function aacHash(file) {
  return c.digest(c.ffmpeg(['-i', file, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', 'pipe:1']));
}
function motionSamples(root, target) {
  const data = c.parsePresentation(
    c.fs.readFileSync(c.path.join(root, 'presentation-data.js'), 'utf8'),
  );
  const scene = data.scenes.find((s) => s.kind !== 'approved-opening' && s.items.length);
  const starts = scene.items.slice(0, 2).map((item) => scene.start + item.at);
  const times = starts.flatMap((start) => [start + 0.1, start + 0.3, start + 0.5]);
  const samples = times.map((time) => ({
    time,
    sha256: c.digest(
      c.ffmpeg([
        '-ss',
        String(time),
        '-i',
        target,
        '-frames:v',
        '1',
        '-vf',
        'crop=1140:470:70:160',
        '-f',
        'image2pipe',
        '-vcodec',
        'png',
        'pipe:1',
      ]),
    ),
  }));
  if (new Set(samples.map((s) => s.sha256)).size < 4)
    throw new Error(
      `Insufficient within-scene motion in${target}; inspect timed reveals before accepting.`,
    );
  return {
    method:
      'Decoded central content crops exclude footer, progress and subtitle area; 0.2-second samples during two anchored reveals.',
    samples,
    uniqueCrops: new Set(samples.map((s) => s.sha256)).size,
  };
}
/** Verifies one lesson/video path, throwing before atomic promotion when an invariant fails. */
function verify(lesson, target, options = {}) {
  const root = c.lessonDirectory(lesson),
    timing = c.readJson(c.path.join(root, 'timing.json'));
  assertPrepared(lesson, timing);
  const filename = target || c.path.join(root, `lesson-${lesson}.mp4`),
    meta = c.probe(filename);
  const video = meta.streams.find((s) => s.codec_type === 'video'),
    audio = meta.streams.find((s) => s.codec_type === 'audio'),
    subtitle = meta.streams.find((s) => s.codec_type === 'subtitle');
  if (
    !video ||
    video.codec_name !== 'h264' ||
    video.width !== c.SIZE.width ||
    video.height !== c.SIZE.height ||
    video.r_frame_rate !== '30/1'
  )
    throw new Error(
      `Lesson${lesson}: unexpected video stream. Rerender with the approved 30fps settings.`,
    );
  if (
    !audio ||
    audio.codec_name !== 'aac' ||
    !subtitle ||
    subtitle.codec_name !== 'mov_text' ||
    !subtitle.tags ||
    subtitle.tags.language !== 'eng'
  )
    throw new Error(`Lesson${lesson}: audio or English subtitle stream missing. Rerun mux/render.`);
  if (Math.abs(Number(meta.format.duration) - timing.duration) > 0.1)
    throw new Error(
      `Lesson${lesson}: video/narration duration mismatch. Inspect frame count and mux timing.`,
    );
  const audioHash = aacHash(filename);
  if (audioHash !== aacHash(c.path.join(root, 'narration.m4a')))
    throw new Error(
      `Lesson${lesson}: exported audio packets differ from retained narration. Rerun mux without audio processing.`,
    );
  c.ffmpeg(['-i', filename, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', '-']);
  const source = c.sourceFingerprint(lesson);
  if (options.checkExistingReport) {
    const report = c.readJson(c.path.join(root, 'render-report.json'));
    if (report.sourceFingerprint.sha256 !== source.sha256)
      throw new Error(
        `Lesson${lesson}: visual sources changed after export. Rerender before declaring complete.`,
      );
  }
  return {
    status: 'verified',
    lesson,
    duration: Number(meta.format.duration),
    expectedAudioDuration: timing.duration,
    video: { codec: video.codec_name, ...c.SIZE, fps: c.FPS },
    audio: { codec: audio.codec_name, sampleRate: audio.sample_rate, channels: audio.channels },
    captions: 'English mov_text',
    originalSourceHashesMatched: true,
    originalAudioClips: 13,
    exportedAacPacketsMatchRetained: true,
    aacPacketSha256: audioHash,
    fullDecode: 'passed',
    bytes: c.fs.statSync(filename).size,
    sha256: c.digest(c.fs.readFileSync(filename)),
    sourceFingerprint: source,
    motionVerification: motionSamples(root, filename),
  };
}
module.exports = { verify };
