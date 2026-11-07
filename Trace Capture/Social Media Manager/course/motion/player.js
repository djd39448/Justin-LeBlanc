/**
 * Accessible narration transport shared by all course presentations.
 * Dependencies: COURSE_DATA, visuals.js, local narration.m4a and the presentation template.
 * Consumers: learners and offline renderAt callers. Keeps play/seek/pause and exported cues aligned.
 */
(() => {
  'use strict';
  const data = window.COURSE_DATA;
  const $ = (id) => document.getElementById(id);
  const audio = $('audio');
  const capture = new URLSearchParams(location.search).has('capture');
  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let captions = true;
  let current = 0;
  let raf = 0;
  const label = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

  /** @param {number} seconds Finite absolute narration time. @returns {void} */
  window.renderAt = (seconds) => {
    if (!Number.isFinite(seconds))
      throw new TypeError('renderAt needs finite seconds; check capture timing.');
    current = Math.max(0, Math.min(data.duration, seconds));
    const chapter = window.drawCourse(current, reduced);
    if (capture) return;
    const cue = data.captions.find((c) => current >= c.start && current < c.end);
    const text = captions && cue ? cue.text : '';
    $('caption').textContent = $('mobile-caption').textContent = text;
    $('seek').value = String(current);
    $('clock').textContent = `${label(current)} / ${label(data.duration)}`;
    $('chapters').value = String(chapter);
    $('stage-progress').style.transform = `scaleX(${current / data.duration})`;
  };

  function fit() {
    const box = $('viewport');
    const height = box.clientHeight - (document.fullscreenElement ? 64 : 0);
    const scale = Math.min(box.clientWidth / 1280, height / 720);
    $('stage').style.transform =
      `translate(${(box.clientWidth - 1280 * scale) / 2}px, ${(height - 720 * scale) / 2}px) scale(${scale})`;
  }

  function seek(seconds) {
    audio.currentTime = Math.max(0, Math.min(data.duration, seconds));
    window.renderAt(audio.currentTime);
  }

  function tick() {
    window.renderAt(audio.currentTime);
    if (!audio.paused) raf = requestAnimationFrame(tick);
  }

  async function play() {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended) seek(0);
    try {
      await audio.play();
    } catch (error) {
      $('status').textContent =
        `Playback failed: ${error.message}. Reload or use the video link below.`;
    }
  }

  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await $('viewport').requestFullscreen();
    } catch (error) {
      $('status').textContent =
        `Full screen unavailable: ${error.message}. Use browser zoom or the video link.`;
    }
  }

  function controls() {
    $('seek').max = String(data.duration);
    $('seek').addEventListener('input', (event) => seek(Number(event.target.value)));
    $('play').addEventListener('click', play);
    $('full-play').addEventListener('click', play);
    $('full-back').addEventListener('click', () => seek(audio.currentTime - 5));
    $('full-forward').addEventListener('click', () => seek(audio.currentTime + 5));
    $('fullscreen').addEventListener('click', fullscreen);
    $('full-exit').addEventListener('click', fullscreen);
    $('motion').checked = reduced;
    $('motion').addEventListener('change', (event) => {
      reduced = event.target.checked;
      window.renderAt(current);
    });
    $('cc').addEventListener('click', () => {
      captions = !captions;
      $('cc').setAttribute('aria-pressed', String(captions));
      window.renderAt(current);
    });
    data.scenes.forEach((scene, i) => {
      const option = document.createElement('option');
      option.value = String(i);
      option.textContent = `${i + 1}. ${scene.title}`;
      $('chapters').append(option);
    });
    $('chapters').addEventListener('change', (event) =>
      seek(data.scenes[Number(event.target.value)].start),
    );
  }

  function mediaEvents() {
    audio.addEventListener('play', () => {
      $('play').textContent = $('full-play').textContent = 'Pause';
      $('status').textContent = 'Playing Brian’s approved narration';
      cancelAnimationFrame(raf);
      tick();
    });
    audio.addEventListener('pause', () => {
      $('play').textContent = $('full-play').textContent = 'Resume';
      $('status').textContent = 'Paused · Resume when you’re ready';
      cancelAnimationFrame(raf);
      window.renderAt(audio.currentTime);
    });
    audio.addEventListener('seeked', () => window.renderAt(audio.currentTime));
    audio.addEventListener('ended', () => {
      $('play').textContent = $('full-play').textContent = 'Replay lesson';
      $('status').textContent =
        'Lesson complete. Choose a chapter to review or return to the exercise.';
    });
    audio.addEventListener('error', () => {
      $('status').textContent =
        'Narration could not load. Keep the course folder together, or use the video link.';
    });
  }

  if (capture) {
    document.body.classList.add('capture');
    reduced = false;
  }
  controls();
  mediaEvents();
  new ResizeObserver(fit).observe($('viewport'));
  document.addEventListener('fullscreenchange', fit);
  fit();
  window.renderAt(0);
})();
