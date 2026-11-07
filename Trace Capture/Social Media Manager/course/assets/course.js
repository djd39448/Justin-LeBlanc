/** Local learner check-ins for the course index; no account or network is required. */
(() => {
  'use strict';
  const key = 'idea-to-build-course-progress-v1';
  const list = document.querySelector('#lesson-list');
  const label = document.querySelector('#progress-label');
  const fill = document.querySelector('#progress-fill');
  const bar = document.querySelector('[role="progressbar"]');
  const manifestLessons = window.COURSE_CURRICULUM?.lessons;
  if (
    Array.isArray(manifestLessons) &&
    manifestLessons.length > 0 &&
    manifestLessons.every(
      (lesson) =>
        typeof lesson.id === 'string' &&
        typeof lesson.title === 'string' &&
        typeof lesson.source === 'string' &&
        typeof lesson.summary === 'string',
    )
  ) {
    const ordered = [...manifestLessons].sort((a, b) => a.order - b.order);
    const rows = ordered.map((lesson) => {
      const row = document.createElement('li');
      const number = document.createElement('span');
      number.textContent = lesson.id;
      const link = document.createElement('a');
      link.href = lesson.source;
      link.textContent = lesson.title;
      const summary = document.createElement('span');
      summary.textContent = lesson.summary;
      row.append(number, link, summary);
      return row;
    });
    list.replaceChildren(...rows);
  }
  const items = [...list.querySelectorAll('li')];
  bar.setAttribute('aria-valuemax', String(items.length));
  let saved = [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value)) saved = value;
  } catch {
    // Progress is optional when local storage is blocked.
  }
  function update() {
    const state = items.map((item) => item.querySelector('input').checked);
    const done = state.filter(Boolean).length;
    label.textContent = `${done} of ${items.length} lessons marked complete`;
    fill.style.width = `${(done / items.length) * 100}%`;
    bar.setAttribute('aria-valuenow', String(done));
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* Optional persistence. */
    }
  }
  items.forEach((item, index) => {
    const control = document.createElement('label');
    control.className = 'lesson-check';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = Boolean(saved[index]);
    input.setAttribute('aria-label', `Mark lesson ${index + 1} complete`);
    input.addEventListener('change', update);
    control.append(input, document.createTextNode('Done'));
    item.append(control);
  });
  document.querySelector('#reset-progress').addEventListener('click', () => {
    items.forEach((item) => {
      item.querySelector('input').checked = false;
    });
    update();
  });
  update();
})();
