# Lesson 1: The whole system

Dave approved the course and Brian narration, then approved the animated visual preview on 2026-11-07. This lesson now uses that style throughout its 13 narration chapters; the first approximately 69 seconds preserve the approved opening.

- [Interactive presentation](presentation.html): synchronized progressive visuals, captions, seeking, chapter selection, reduced motion, and fullscreen controls.
- [Narrated video](lesson-01.mp4): 1280 × 720, 30 fps H.264/AAC with an optional English subtitle track.
- [Captions](captions.vtt), [transcript](transcript.md), [timing](timing.json), and [export evidence](render-report.json).
- [Lesson plan, lecture, and exercise](../lessons/01.html).

The HTML and MP4 share the same deterministic visual timeline. All 13 original ElevenLabs Brian MP3s, returned character alignments, and per-clip captions are retained unchanged. The continuous `narration.m4a` joins decoded samples without modifying speech; the video copies those AAC packets. No new narration or provider request was made for this visual revision.

The fictional performer illustration was generated for the approved style preview; its prompt is in `../style-preview/assets/performer-prompt.txt`. Diagrams and example UI are editable HTML/CSS with fictional data. Typography uses local system fonts; playback requires no external runtime services.

Use the [current production instructions](../motion/README.md). For this lesson only:

```sh
node course/motion/build-course.cjs prepare --lesson 01 --json
node course/motion/build-presentations.cjs --lesson 01 --json
node course/motion/build-course.cjs render --lesson 01 --json
node course/motion/build-course.cjs verify --lesson 01 --json
```

Run from the Social Media Manager directory. `build-pilot.cjs` is historical and renders the superseded static style; do not use it for current production. See the export report for measured duration and file hashes. Detailed caption review and real beginner validation remain outstanding; this local build does not provide hosting or a paywall.
