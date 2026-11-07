/**
 * Checks authored visual text bounds at every reveal, callout and conclusion boundary.
 * Dependencies: common paths/data and an injected Playwright capture-session factory.
 * Consumed by: render.cjs audit, exposed through build-course.cjs audit.
 * Why: a full-course rollout needs mechanical overlap checks in addition to human scene review.
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const c = require('./common.cjs');
/** Browser-side audit: reports visible text clipping, collisions and subtitle-area intrusion. */
function inspectLayout() {
  const findings = [];
  const visible = (element) => {
    if (!element) return false;
    for (let p = element; p; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) < 0.1)
        return false;
    }
    return element.getBoundingClientRect().width > 0;
  };
  const box = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect();
  };
  const record = (type, element, rect) =>
    findings.push({
      type,
      text: element.textContent.trim().slice(0, 100),
      bounds: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
    });
  const within = (a, b, padding = 1) =>
    a.left >= b.left - padding &&
    a.top >= b.top - padding &&
    a.right <= b.right + padding &&
    a.bottom <= b.bottom + padding;
  const intersect = (a, b) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
  const stage = document.getElementById('stage').getBoundingClientRect();
  const board = document.getElementById('board');
  if (!visible(board)) return findings;
  const text = [
    ...board.querySelectorAll(
      '.board-label,.board-detail,.document-title,.document-detail,.meter-current strong,.meter-current span,#board-title,#board-conclusion',
    ),
  ].filter(visible);
  for (const element of text) {
    const rect = box(element);
    if (!within(rect, stage)) record('outside-stage', element, rect);
  }
  const conclusion = document.getElementById('board-conclusion');
  if (visible(conclusion) && box(conclusion).bottom > 608)
    record('subtitle-area-intrusion', conclusion, box(conclusion));
  for (const item of board.querySelectorAll('.board-item')) {
    const label = item.querySelector('.board-label'),
      detail = item.querySelector('.board-detail');
    if (visible(label) && visible(detail) && intersect(box(label), box(detail)))
      record('label-detail-overlap', label, box(label));
  }
  const sheet = board.querySelector('.document-sheet');
  if (visible(sheet))
    for (const element of sheet.querySelectorAll('.document-title,.document-detail'))
      if (visible(element) && !within(box(element), sheet.getBoundingClientRect()))
        record('outside-document-sheet', element, box(element));
  const conversation = board.querySelector('.board-conversation');
  if (conversation) {
    const bubbles = [...conversation.querySelectorAll('.board-item')].filter(visible),
      boundary = conversation.getBoundingClientRect();
    for (const bubble of bubbles)
      if (!within(bubble.getBoundingClientRect(), boundary))
        record('conversation-outside-body', bubble, bubble.getBoundingClientRect());
    for (let i = 0; i < bubbles.length; i++)
      for (let j = i + 1; j < bubbles.length; j++)
        if (intersect(bubbles[i].getBoundingClientRect(), bubbles[j].getBoundingClientRect()))
          record('conversation-overlap', bubbles[i], bubbles[i].getBoundingClientRect());
  }
  if (document.documentElement.scrollWidth > innerWidth)
    findings.push({
      type: 'horizontal-overflow',
      text: 'document',
      width: document.documentElement.scrollWidth,
    });
  return findings;
}
/** Audits one lesson and writes repeatable diagnostic evidence; returns all distinct defects. */
async function auditLesson(lesson, captureSession) {
  const data = c.readPresentation(lesson);
  const session = await captureSession(lesson),
    defects = [],
    seen = new Set();
  let inspected = 0;
  try {
    for (const scene of data.scenes) {
      if (scene.kind === 'approved-opening') continue;
      const cues = [
        0,
        ...scene.items.map((item) => item.at),
        ...(scene.callouts || []).map((cue) => cue.at),
        scene.conclusion.at,
      ];
      for (const cue of cues) {
        const time = Math.min(scene.end - 0.05, scene.start + cue + 0.8);
        await session.page.evaluate((seconds) => window.renderAt(seconds), time);
        for (const finding of await session.page.evaluate(inspectLayout)) {
          const key = `${scene.id}/${finding.type}/${finding.text}`;
          if (!seen.has(key)) {
            seen.add(key);
            defects.push({ scene: scene.id, kind: scene.kind, time, ...finding });
          }
        }
        inspected++;
      }
    }
    const report = {
      lesson,
      status: defects.length ? 'defects' : 'passed',
      inspectedStates: inspected,
      defects,
      browserErrors: session.errors,
    };
    c.fs.mkdirSync(c.path.join(c.MOTION, 'review'), { recursive: true });
    c.writeJson(c.path.join(c.MOTION, 'review', `layout-${lesson}.json`), report);
    return report;
  } finally {
    await session.close();
  }
}
module.exports = { auditLesson };
