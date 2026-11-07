/**
 * Builds and draws ten content-specific visual treatments at exact narration times.
 * Dependencies: compiled COURSE_DATA, approved-opening.js and presentation.css.
 * Consumers: player.js and the offline renderer through renderAt/frameKey.
 * Why: meaningful phrase-timed motion must survive seeking and MP4 export identically.
 */
(() => {
  'use strict';
  const data = window.COURSE_DATA;
  if (!data || !data.scenes.length)
    throw new Error('Missing lesson data; run build-course.cjs prepare.');
  const $ = (id) => document.getElementById(id);
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (v) => 1 - (1 - clamp(v)) ** 3;
  const DURATION = 1.2;
  let selected = -1;
  let elements = [];
  let reduced = false;
  const progress = (t, at, length = 0.75) => (reduced ? Number(t >= at) : ease((t - at) / length));

  function node(tag, className, text) {
    const result = document.createElement(tag);
    result.className = className;
    if (text !== undefined) result.textContent = text;
    return result;
  }

  function makeItem(item, i, kind) {
    const result = node('div', 'board-item');
    if (['sequence', 'document', 'evidence'].includes(kind))
      result.append(node('span', 'board-index', String(i + 1).padStart(2, '0')));
    if (['flow', 'checkpoint'].includes(kind))
      result.append(node('span', 'flow-number', String(i + 1)));
    result.append(node('h2', 'board-label', item.label));
    if (kind !== 'document') result.append(node('p', 'board-detail', item.detail));
    return result;
  }

  function specialStructure(kind, content) {
    if (kind === 'document') {
      const list = node('div', 'doc-list');
      list.append(...elements);
      const sheet = node('div', 'document-sheet');
      sheet.append(
        node('small', '', 'ILLUSTRATIVE DOCUMENT'),
        node('h2', 'document-title'),
        node('p', 'document-detail'),
        node('div', 'document-rule'),
      );
      content.append(list, sheet);
    } else if (kind === 'routing') {
      const list = node('div', 'route-list');
      list.append(...elements);
      const task = node('div', 'route-task');
      task.append(node('small', '', 'MATCH THE WORK'), node('strong', ''));
      content.append(task, node('div', 'route-arrow', '→'), list);
    } else if (kind === 'meter') {
      const number = node('div', 'meter-number');
      number.append(node('b', '', '—'), node('span', '', 'used'));
      const track = node('div', 'meter-track');
      track.append(node('div', 'meter-fill'), node('div', 'meter-reserve'));
      const labels = node('div', 'meter-labels');
      labels.append(node('span', '', '0%'), node('span', '', '75% cutoff · 25% reserve'));
      const current = node('div', 'meter-current');
      current.append(node('strong', ''), node('span', ''));
      content.append(
        number,
        track,
        node('div', 'meter-threshold'),
        labels,
        current,
        node(
          'p',
          'meter-policy',
          'Dave’s configurable policy\nIllustrative usage, not a live account meter',
        ),
      );
    } else {
      if (['flow', 'checkpoint'].includes(kind))
        content.append(node('div', 'flow-line'), node('div', 'flow-token'));
      if (kind === 'example') content.append(node('div', 'example-top', 'WORKED EXAMPLE'));
      content.append(...elements);
    }
  }

  function build(scene) {
    const board = $('board'),
      content = $('board-content');
    board.className = `board ${scene.tone}`;
    $('board-title').textContent = scene.title;
    $('board-eyebrow').textContent = `LESSON ${data.lesson} · ${data.title.toUpperCase()}`;
    $('board-intro').textContent = scene.intro;
    $('board-conclusion').textContent = scene.conclusion.text;
    content.className = `board-${scene.kind}`;
    content.style.setProperty('--count', String(scene.items.length));
    content.style.setProperty('--rows', String(Math.ceil(scene.items.length / 2)));
    content.replaceChildren();
    elements = scene.items.map((item, i) => makeItem(item, i, scene.kind));
    specialStructure(scene.kind, content);
    document.querySelector('.stage-footer').style.color =
      scene.tone === 'paper' ? '#153d3b' : '#e2e9d9';
  }

  function locate(seconds) {
    let index = 0;
    data.scenes.forEach((scene, i) => {
      if (seconds >= scene.start) index = i;
    });
    return index;
  }

  function activeItem(scene, time) {
    let active = -1;
    scene.items.forEach((item, i) => {
      if (time >= item.at) active = i;
    });
    return active;
  }

  function drawItems(scene, time, active) {
    const firstShown = scene.kind === 'conversation' ? Math.max(0, active - 2) : 0;
    elements.forEach((element, i) => {
      const p = progress(time, scene.items[i].at);
      element.style.opacity = i < firstShown ? '0' : String(p);
      element.style.transform = `translateY(${(1 - p) * 22}px)`;
      if (scene.kind === 'conversation') {
        element.style.left = i % 2 ? '230px' : '0';
        element.style.top = `${(i - firstShown) * 100}px`;
      }
      if (scene.kind === 'document' && active !== i && time >= scene.items[i].at)
        element.style.opacity = '.78';
    });
  }

  function drawFlow(scene, time, active) {
    const content = $('board-content'),
      line = content.querySelector('.flow-line'),
      token = content.querySelector('.flow-token');
    const checkpoint = scene.kind === 'checkpoint',
      gap = checkpoint ? 25 : 34;
    const start = checkpoint ? 20 : 26.5;
    const step = (content.clientWidth - gap * (elements.length - 1)) / elements.length + gap;
    const p = active < 0 ? 0 : progress(time, scene.items[active].at, 1.1);
    const position = active <= 0 ? 0 : active - 1 + p;
    line.style.left = `${start}px`;
    line.style.right = 'auto';
    line.style.width = `${step * (elements.length - 1)}px`;
    line.style.transform = `scaleX(${position / (elements.length - 1)})`;
    token.style.left = `${start - 34 + step * position}px`;
    token.style.opacity = String(active < 0 ? 0 : active === 0 ? p : 1);
  }

  function drawDocument(scene, time, active) {
    const sheet = document.querySelector('.document-sheet');
    if (active < 0) {
      sheet.style.opacity = '0';
      return;
    }
    const item = scene.items[active],
      p = progress(time, item.at);
    sheet.style.opacity = String(p);
    sheet.style.transform = `translateY(${(1 - p) * 16}px)`;
    sheet.querySelector('.document-title').textContent = item.label;
    sheet.querySelector('.document-detail').textContent = item.detail;
    sheet.querySelector('.document-rule').style.transform = `scaleX(${p})`;
  }

  function drawRouting(scene, time, active) {
    const task = document.querySelector('.route-task'),
      arrow = document.querySelector('.route-arrow');
    if (active < 0) {
      task.style.opacity = arrow.style.opacity = '0';
      return;
    }
    const item = scene.items[active],
      p = progress(time, item.at, 1.1);
    task.style.opacity = String(p);
    task.style.transform = `translateX(${(1 - p) * -65}px)`;
    task.querySelector('strong').textContent = item.detail;
    arrow.style.opacity = String(p);
    arrow.style.transform = `translateX(${(1 - p) * -30}px)`;
    arrow.style.top = `${((active + 0.5) * $('board-content').clientHeight) / scene.items.length - 30}px`;
    elements.forEach((element, i) => {
      element.style.borderLeft = i === active ? '4px solid var(--accent)' : '4px solid transparent';
    });
  }

  function drawMeter(scene, time, active) {
    const content = $('board-content'),
      prior = scene.items.filter((item) => item.at <= time && Number.isFinite(item.value));
    const last = prior[prior.length - 1];
    let value = 0;
    if (last) {
      const previous = prior.length > 1 ? prior[prior.length - 2].value : 0;
      value = previous + (last.value - previous) * progress(time, last.at, 1.1);
    }
    content.querySelector('.meter-number b').textContent = last ? `${Math.round(value)}%` : '—';
    content.querySelector('.meter-fill').style.transform = `scaleX(${value / 100})`;
    const current = content.querySelector('.meter-current');
    current.style.opacity = active < 0 ? '0' : String(progress(time, scene.items[active].at));
    if (active >= 0) {
      current.querySelector('strong').textContent = scene.items[active].label;
      current.querySelector('span').textContent = scene.items[active].detail;
    }
  }

  /** @param {number} seconds Absolute narration time. @param {boolean} reduce Reduced motion. */
  window.drawCourse = (seconds, reduce) => {
    reduced = reduce;
    const index = locate(seconds),
      scene = data.scenes[index],
      time = seconds - scene.start;
    const opening = scene.kind === 'approved-opening';
    $('approved-opening').style.display = opening ? 'block' : 'none';
    $('board').style.display = opening ? 'none' : 'block';
    if (opening) {
      window.renderApprovedOpening(seconds, reduced);
      selected = -1;
      return index;
    }
    if (selected !== index) {
      build(scene);
      selected = index;
    }
    const active = activeItem(scene, time);
    $('scene-label').textContent =
      `${String(index + 1).padStart(2, '0')} / ${data.scenes.length} · ${scene.title}`;
    $('board-intro').style.opacity = active < 0 && scene.items[0].at > 1.5 ? '1' : '0';
    drawItems(scene, time, active);
    if (['flow', 'checkpoint'].includes(scene.kind)) drawFlow(scene, time, active);
    if (scene.kind === 'document') drawDocument(scene, time, active);
    if (scene.kind === 'routing') drawRouting(scene, time, active);
    if (scene.kind === 'meter') drawMeter(scene, time, active);
    const annotations = [...(scene.callouts || []), scene.conclusion]
      .sort((a, b) => a.at - b.at)
      .filter((cue) => time >= cue.at);
    const annotation = annotations[annotations.length - 1];
    if (active < 0 && annotation) $('board-intro').textContent = annotation.text;
    else $('board-intro').textContent = scene.intro;
    const p = annotation ? progress(time, annotation.at) : 0;
    $('board-conclusion').textContent = annotation ? annotation.text : '';
    $('board-conclusion').style.opacity = active < 0 ? '0' : String(p);
    $('board-conclusion').style.transform = `translateY(${(1 - p) * 10}px)`;
    return index;
  };

  /** Stable visual-state key lets the encoder reuse hold frames; motion is sampled at30fps. */
  window.frameKey = (seconds) => {
    const index = locate(seconds),
      scene = data.scenes[index],
      local = seconds - scene.start;
    if (scene.kind === 'approved-opening') return `opening:${seconds.toFixed(6)}`;
    const anchors = [
      0,
      ...scene.items.map((i) => i.at),
      ...(scene.callouts || []).map((c) => c.at),
      scene.conclusion.at,
    ];
    if (anchors.some((at) => local >= at && local < at + DURATION))
      return `${index}:motion:${seconds.toFixed(6)}`;
    return `${index}:hold:${anchors.filter((at) => local >= at).length}`;
  };
})();
