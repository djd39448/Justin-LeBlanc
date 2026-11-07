/**
 * Tests narration-anchor matching and HTTP byte-range boundaries offline.
 * Dependencies: repository Vitest, Node assertions and production anchor/range helpers.
 * Consumed by: maintainers before course production changes.
 * Why: a wrong anchor or broken media range silently damages synchronization or seeking.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

import { test } from 'vitest';

import { anchorTime, compileScene } from './audio.cjs';
import { IDS, parsePresentation, readPresentation } from './common.cjs';
import { comparePixels } from './frame-comparison.cjs';
import { byteRange } from './server.cjs';

test('chapter seeking tolerates media quantization only within the 1 ms boundary allowance', () => {
  const scene = (start) => ({
    start,
    kind: 'sequence',
    items: [{ at: 0 }],
    conclusion: { at: 3 },
  });
  for (const [boundary, browserTime] of [
    [292.59755102040816, 292.597551],
    [170.68408163265306, 170.684081],
    [266.71020408163264, 266.710203],
  ]) {
    const window = { COURSE_DATA: { scenes: [scene(0), scene(boundary)] } };
    runInNewContext(readFileSync(new URL('../visuals.js', import.meta.url), 'utf8'), { window });
    assert.match(window.frameKey(boundary - 0.002), /^0:/);
    assert.match(window.frameKey(browserTime), /^1:/);
    assert.match(window.frameKey(boundary), /^1:/);
    assert.match(window.frameKey(boundary + 0.001), /^1:/);
  }
});

test('all retained course chapter boundaries select correctly at browser precision', () => {
  const source = readFileSync(new URL('../visuals.js', import.meta.url), 'utf8');
  let checked = 0;
  for (const lesson of IDS) {
    const data = readPresentation(lesson);
    const window = { COURSE_DATA: data };
    runInNewContext(source, { window });
    data.scenes.forEach((scene, index) => {
      if (scene.kind === 'approved-opening') return;
      const browserTime = Math.floor(scene.start * 1e6) / 1e6;
      assert.equal(
        window.frameKey(browserTime).split(':')[0],
        String(index),
        `${lesson}/${scene.id}`,
      );
      checked++;
    });
  }
  assert.equal(checked, 128);
});

test('approved opening receives its exact chapter start after a truncated media seek', () => {
  const data = readPresentation('01');
  const boundary = data.scenes[1].start;
  let renderedTime;
  const window = {
    COURSE_DATA: data,
    renderApprovedOpening: (time) => {
      renderedTime = time;
    },
  };
  const document = { getElementById: () => ({ style: {} }) };
  runInNewContext(readFileSync(new URL('../visuals.js', import.meta.url), 'utf8'), {
    window,
    document,
  });
  assert.equal(window.drawCourse(Math.floor(boundary * 1e6) / 1e6, false), 1);
  assert.equal(renderedTime, boundary);
});

const words = [
  { text: 'An', start: 0, end: 0.2 },
  { text: 'agent-ready', start: 0.3, end: 0.7 },
  { text: 'plan.', start: 0.8, end: 1.1 },
  { text: 'A', start: 2, end: 2.1 },
  { text: 'plan', start: 2.2, end: 2.4 },
  { text: 'follows.', start: 2.5, end: 3 },
];
test('matches punctuation-normalized spoken phrases at original word time', () => {
  assert.equal(anchorTime(words, 'agent ready plan', 0, 'test'), 0.3);
});
test('rejects a phrase that would move the choreography backward', () => {
  assert.throws(() => anchorTime(words, 'agent-ready plan', 2, 'test'), /out-of-order/);
});
test('rejects invented words instead of guessing a timeline', () => {
  assert.throws(() => anchorTime(words, 'approved working software', 0, 'test'), /missing/);
});
test('supports suffix and open-ended native media ranges', () => {
  assert.deepEqual(byteRange('bytes=-20', 100), { start: 80, end: 99, partial: true });
  assert.deepEqual(byteRange('bytes=20-', 100), { start: 20, end: 99, partial: true });
});
test('rejects out-of-file and reversed ranges', () => {
  assert.throws(() => byteRange('bytes=100-', 100));
  assert.throws(() => byteRange('bytes=80-20', 100));
});
test('rejects multiple byte ranges instead of returning misleading content', () => {
  assert.throws(() => byteRange('bytes=0-10,30-40', 100));
});

test('compiles midpoint callouts independently of the final item time', () => {
  const scene = {
    id: '01',
    kind: 'sequence',
    tone: 'paper',
    title: 'Plan',
    intro: 'Define it',
    items: [
      { label: 'Idea', detail: '', anchor: 'An agent-ready' },
      { label: 'Plan', detail: '', anchor: 'agent-ready plan' },
      { label: 'Next', detail: '', anchor: 'A plan' },
    ],
    callouts: [{ text: 'An early explanatory annotation', anchor: 'agent-ready plan' }],
    conclusion: { text: 'Continue', anchor: 'plan follows' },
  };
  const compiled = compileScene(scene, { id: '01', start: 50, end: 53, duration: 3, words }, '02');
  assert.equal(compiled.callouts[0].at, 0.3);
  assert.equal(compiled.items[2].at, 2);
  assert.equal(compiled.start, 50);
});

test('reads formatter-normalized generated browser assignments', () => {
  const data = parsePresentation(
    "/* generated */ window.COURSE_DATA = { lesson: '01', scenes: [], };\n",
  );
  assert.equal(data.lesson, '01');
  assert.equal(data.scenes.length, 0);
});

test('accepts only the documented tiny Chromium edge-rasterization allowance', () => {
  const first = Buffer.alloc(18);
  const second = Buffer.alloc(18);
  second[0] = 2;
  assert.deepEqual(comparePixels(first, second), {
    accepted: true,
    changedPixels: 1,
    maximumChannelDelta: 2,
    summedAbsoluteChannelDelta: 2,
  });
  second[0] = 17;
  assert.equal(comparePixels(first, second).accepted, false);
  second.fill(0);
  second.set([16, 16, 9]);
  assert.equal(comparePixels(first, second).accepted, false);
  second.set([16, 16, 8]);
  assert.equal(comparePixels(first, second).accepted, true);
  second.fill(0);
  for (const index of [0, 3, 6, 9, 12]) second[index] = 1;
  assert.equal(comparePixels(first, second).accepted, false);
});
