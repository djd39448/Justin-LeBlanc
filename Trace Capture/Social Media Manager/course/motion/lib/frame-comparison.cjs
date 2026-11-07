/**
 * Compares rendered pixels while recording tiny Chromium edge-rasterization variation.
 * Dependencies: common FFmpeg adapter for decoding capture PNGs into RGB bytes.
 * Consumed by: deterministic timeline audit before offline rendering.
 * Why: byte-level PNG equality can reject an unchanged DOM for one antialiased glyph-edge pixel.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS. */
const c = require('./common.cjs');
function comparePixels(first, second) {
  if (first.length !== second.length || first.length % 3 !== 0)
    throw new Error('Frame dimensions differ; check the fixed capture viewport.');
  let changedPixels = 0;
  let maximumChannelDelta = 0;
  let summedAbsoluteChannelDelta = 0;
  for (let i = 0; i < first.length; i += 3) {
    let changed = false;
    for (let channel = 0; channel < 3; channel++) {
      const delta = Math.abs(first[i + channel] - second[i + channel]);
      if (delta) changed = true;
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
      summedAbsoluteChannelDelta += delta;
    }
    if (changed) changedPixels++;
  }
  return {
    accepted: changedPixels <= 4 && maximumChannelDelta <= 16 && summedAbsoluteChannelDelta <= 40,
    changedPixels,
    maximumChannelDelta,
    summedAbsoluteChannelDelta,
  };
}
function compareFrames(first, second) {
  if (c.digest(first) === c.digest(second))
    return {
      accepted: true,
      changedPixels: 0,
      maximumChannelDelta: 0,
      summedAbsoluteChannelDelta: 0,
    };
  const decode = (input) =>
    c.ffmpeg(['-i', 'pipe:0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'], { input });
  return comparePixels(decode(first), decode(second));
}
module.exports = { comparePixels, compareFrames };
