/** Generated from the approved style preview. Dependencies: COURSE_DATA and opening markup.
 * Consumed by visuals.js for Lesson 01; preserve the accepted first 69 seconds. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const second = window.COURSE_DATA.scenes[1].start;
  const nodes = [...document.querySelectorAll('#approved-opening .scene')];
  const ranges = [0, 8.661, 13.201, 21.943, second, second + 10.588, second + 24.312];
  const names = [
    'The idea',
    'The desired experience',
    'The quick start',
    'The open questions',
    'Make decisions visible',
    'Cloud → Contract → Code',
    'Lead the conversation',
  ];
  let reduce = false;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const ease = (v) => 1 - (1 - clamp(v)) ** 3;
  const progress = (t, start, length = 0.65) =>
    reduce ? Number(t >= start) : ease((t - start) / length);
  function reveal(id, t, start, distance = 24) {
    const element = typeof id === 'string' ? $(id) : id;
    const p = progress(t, start);
    element.style.opacity = String(p);
    element.style.transform = `translateY(${(1 - p) * distance}px)`;
  }

  function setScenes(t) {
    let active = 0;
    ranges.forEach((start, i) => {
      if (t >= start) active = i;
    });
    nodes.forEach((node, i) => {
      node.style.opacity = i === active ? '1' : '0';
      node.style.visibility = i === active ? 'visible' : 'hidden';
    });
    const dark = [2, 4, 6].includes(active);
    document.querySelector('.stage-footer').style.color = dark ? '#e2e9d9' : '#153d3b';
    $('scene-label').textContent = names[active];
  }

  function drawOpening(t) {
    reveal(document.querySelector('.arrival-person'), t, 2.775, 40);
    reveal('email', t, 6.177, 45);
    reveal('text', t, 6.966, 45);
    reveal('form', t, 7.5, 45);
    reveal('tracker', t, 8.661, 30);
    const gathering = progress(t, 8.661, 1.1);
    document.querySelector('.gather-person').style.transform =
      `translateX(${(1 - gathering) * 300}px) scale(${1 + (1 - gathering) * 0.2})`;
    document.querySelectorAll('.tracker-row').forEach((node, i) => {
      const p = progress(t, 8.8 + i * 0.27, 0.9);
      node.style.opacity = String(p);
      node.style.transform = `translate(${(1 - p) * (i === 0 ? -180 : 110)}px, ${(1 - p) * (30 - i * 55)}px)`;
    });
    document.querySelectorAll('.reply-label').forEach((node) => reveal(node, t, 11.784, 12));
    $('reply-underline').style.transform = `scaleX(${progress(t, 11.784)})`;
    reveal('prompt', t, 13.201, 20);
    reveal('code-window', t, 17.81, 30);
    document
      .querySelectorAll('[data-code]')
      .forEach((node, i) => reveal(node, t, 17.85 + i * 0.58, 8));
    $('code-progress').style.transform = `scaleX(${clamp((t - 17.81) / 4.4)})`;
    reveal('rush-caption', t, 20.05, 15);
  }

  function drawQuestions(t) {
    const starts = [21.943, 24.056, 25.646, 27.33];
    const pictures = ['inquiry-picture', 'people-picture', 'send-picture', 'duplicate-picture'];
    const selected = starts.reduce((n, start, i) => (t >= start ? i : n), 0);
    starts.forEach((start, i) => {
      reveal(`q${i}`, t, start, 15);
      if (t >= start && i !== selected) $(`q${i}`).style.opacity = '0.78';
      reveal(pictures[i], t, start, 18);
      if (i !== selected) $(pictures[i]).style.opacity = '0';
    });
    reveal('assumption-banner', t, 31.068, 25);
    reveal(document.querySelector('.duplicate.second'), t, 28.05, 30);
    reveal(document.querySelector('.same-event'), t, 29.15, 10);
  }

  function drawJourney(t) {
    const local = t - second;
    reveal('d0', local, 1.6, 20);
    reveal('d1', local, 3.32, 20);
    reveal('build-path', local, 6.641, 20);
    ['cloud-node', 'contract-node', 'implementation-node'].forEach((id, i) => {
      reveal(id, local, 10.588 + i * 0.75, 25);
      const focus = local < 16.196 ? 0 : local < 21.572 ? 1 : 2;
      if (local >= 13.468 && focus !== i) $(id).style.opacity = '0.78';
    });
    $('path1').style.strokeDashoffset = String(47 * (1 - progress(local, 11.34)));
    $('path2').style.strokeDashoffset = String(47 * (1 - progress(local, 12.09)));
    reveal('contract-behavior', local, 16.196, 10);
    reveal('contract-proof', local, 19.424, 10);
    document
      .querySelectorAll('.idea-cluster span')
      .forEach((node, i) => reveal(node, local, 13.468 + i * 0.45, 16));
    document
      .querySelectorAll('.mini-app p')
      .forEach((node, i) => reveal(node, local, 21.572 + i * 0.65, 12));
    const focusText =
      local < 16.196
        ? 'Start with the messy idea.'
        : local < 21.572
          ? 'Agree on the behavior and the proof.'
          : 'Build from the shared description.';
    $('journey-focus').textContent = focusText;
    reveal('journey-focus', local, 13.468, 10);
    reveal('intended', local, 27.063, 20);
    reveal('observed', local, 29.943, 20);
    reveal('compare-line', local, 29.943, 10);
  }

  /** Draw the approved opening at absolute narration seconds; honor reduced motion. */
  window.renderApprovedOpening = (seconds, reduced) => {
    reduce = reduced;
    setScenes(seconds);
    drawOpening(seconds);
    drawQuestions(seconds);
    drawJourney(seconds);
  };
})();
