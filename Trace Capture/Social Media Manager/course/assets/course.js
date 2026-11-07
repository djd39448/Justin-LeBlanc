/** Local learner check-ins for the course index; no account or network is required. */
(() => {
  'use strict';
  const key = 'idea-to-build-course-progress-v1';
  const list = document.querySelector('#lesson-list');
  const label = document.querySelector('#progress-label');
  const fill = document.querySelector('#progress-fill');
  const bar = document.querySelector('[role="progressbar"]');
  const items = [...list.querySelectorAll('li')];
  let saved = [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    if (Array.isArray(value)) saved = value;
  } catch (_) {
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
    } catch (_) {
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
