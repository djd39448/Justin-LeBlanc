# Animated course production

The approved visual style is implemented as one deterministic HTML timeline for browser playback and video export. All ten lessons use Brian’s retained narration. No command in this pipeline calls a voice provider.

## Editable sources

- `storyboards/01.json` through `10.json`: curated teaching compositions, exact narration phrase anchors, staged items, and conclusions/callouts.
- `visuals.js` and `presentation.css`: ten visual treatments, including progressive diagrams, conversations, document construction, comparisons, routing, gauges, checkpoints, and examples.
- `player.js`: playback, captions, chapter selection, seeking, reduced motion, and fullscreen controls.
- `presentation-template.html` and `build-presentations.cjs`: generate the existing presentation URLs. The first two Lesson 1 scenes reuse the approved opening from `../style-preview/` through generated `approved-opening.js`.
- `assets/performer.png`: the original fictional character generated for the approved preview. Its source prompt remains in `../style-preview/assets/performer-prompt.txt`.
- `audio-baseline.json`: fingerprints of all 130 original MP3s and their alignment, caption, and receipt sources. Restore approved originals if verification fails; do not regenerate this baseline to accept changed speech.
- `build-course.cjs` and `lib/`: offline preparation, range-capable preview server, layout audit, deterministic capture, encoding, and verification.

## Reproduce

Run from the Social Media Manager directory with the existing Node/Playwright/Chromium installation and local FFmpeg/FFprobe:

```sh
node ../../node_modules/vitest/vitest.mjs run course/motion/lib/pipeline.test.mjs
node course/motion/build-course.cjs --help
node course/motion/build-course.cjs prepare --all --json
node course/motion/build-presentations.cjs --all --json
node course/motion/build-course.cjs stills --all --json
node course/motion/build-course.cjs audit --all --json
node course/motion/build-course.cjs render --all --json
node course/motion/build-course.cjs verify --all --json
node course/update-manifest.cjs
```

Use `--lesson 04` instead of `--all` for a single lesson. To review locally, run `node course/motion/build-course.cjs serve --port 4175 --json` and open `http://127.0.0.1:4175/`. Stop the server when finished. Direct `file://` presentation links also use local assets; the server provides reliable byte-range media seeking.

Preparation checks script/alignment hashes, decodes the existing MP3s, joins exact PCM samples, and builds a continuous AAC narration track. Phrase anchors resolve against the retained character alignment. Nothing rewrites speech, inserts new narration, or changes voice speed. Durations omit the small per-clip encoding padding in the earlier videos.

`timing.json`, `presentation-data.js`, `cues.json`, and `captions.vtt` are generated alongside each presentation. Format and freeze browser sources before rendering. A source fingerprint protects each export against later edits to shared visuals, lesson storyboards, generated HTML/data, and approved opening assets. Rerender affected videos after visual edits; never just update their reports.

The renderer captures every moving interval at 30 fps and reuses frames only during identical reading holds. It audits those holds and backward-seek determinism. Final MP4s are 1280 × 720 H.264/AAC with an English subtitle track. A new video replaces the prior video only after the verification gate passes. Generated `motion-frames/`, `.motion-work/`, and `review/` files are disposable intermediates.

## Evidence and limits

Each lesson’s `render-report.json` records its source fingerprint, output hash, full audio/video decode, duration/streams, retained-audio verification, exact AAC packet reuse, and decoded within-scene visual changes outside the progress/caption region. `rollout-evidence.json` summarizes the completed batch, layout audit, original-source preservation, and review coverage.

Review includes all 130 scene compositions and representative full-size frames. Automated export verification is not a human watch-through of the entire course. Detailed caption review, real beginner comprehension, and physical-device testing remain separate. Hosting and paid access are outside this visual revision.

## Recovery

Keep the complete `course/` directory together; it contains the shared runtime and local assets. Do not use the historical `pilot/build-pilot.cjs` or `production/build.cjs` to regenerate current visuals. Their old render paths predate this style. The previous course package is in commit `53c76c5`; restore only the intended course files from that revision if rollback is needed, preserving unrelated user work and the original narration.
