# Animated visual style preview

This separate review package covers the first two paragraphs of Lesson 1, approximately 69 seconds, using the existing approved Brian narration. Dave approved the course content and narration on 2026-11-07, requested more active visual teaching, and authorized this excerpt before applying a new style to the remaining course. Original lesson packages are unchanged.

Open `index.html` for the animated presentation or `style-preview.mp4` for the video. Keep this directory together: the HTML uses relative assets and needs no remote fonts, scripts, account, or API. The video has an optional English subtitle track; `captions.vtt` and `transcript.md` are also provided. The HTML has captions enabled by default, keyboard-accessible controls, seeking, chapter shortcuts, full screen, and a reduced-motion option. A visual description is below the player.

## Visual direction

Warm paper, deep teal, muted coral, and ochre; editorial typography; one recurring fictional performer. Seven compositions follow the speech: scattered channels, an illustrative inquiry list, a prompt that triggers premature coding, unresolved questions, visible decisions, the progressively explained cloud/contract/code route, and comparison of intention with the result. Every content reveal uses a retained speech timestamp. Pausing and seeking redraw the same visual state, and the video captures that same deterministic timeline at 30 frames per second.

The performer and sample inquiries are fictional. The coding view is explicitly pseudocode. Sending and duplicate handling remain unresolved questions. The examples do not claim a real tracker has been deployed or verified.

## Reproduce

Run from the Social Media Manager directory using the repository's existing Node/Playwright/Chromium installation and local FFmpeg/FFprobe:

```sh
node course/style-preview/build-preview.cjs --help
node course/style-preview/build-preview.cjs prepare --json
node course/style-preview/build-preview.cjs serve --port 4175 --json
node course/style-preview/build-preview.cjs stills --json
node course/style-preview/build-preview.cjs render --json
node course/style-preview/build-preview.cjs verify --json
```

`prepare` verifies the approved script against retained alignment hashes, decodes the two original MP3 clips and concatenates their samples, retains their original SHA-256 fingerprints, and writes audio, captions, exact timing, and browser metadata. It never calls a voice provider. `render` serves this directory on loopback, advances `window.renderAt(seconds)` at exact frame times, encodes those frames, and muxes narration and subtitles. The MP4 is H.264/AAC at 1280×720, 30 fps. Generated frame and audio intermediates can be recreated.

`timing.json` is generated source timing; `preview.js` defines the visual choreography; `index.html` and `preview.css` define editable scene content and styling. `metadata.js` is the generated browser timing subset, allowing direct local file use without fetching JSON. `render-report.json` records final media verification and fingerprints. Edit these preview sources only until Dave reviews the style.

## Asset provenance

- Narration: existing approved ElevenLabs Brian clips `../pilot/audio/01.mp3` and `02.mp3`, with their retained character alignments and captions. No speech generation, narration rewrite, or new voice-provider request.
- Illustration: `assets/performer.png`, generated with the built-in image-generation tool on 2026-11-07 for this preview. Original fictional character; no real-person portrait or external photo. Transparency retained. Prompt recorded in `assets/performer-prompt.txt`.
- Typography: local Georgia and Arial/system fallbacks. No downloaded font or external runtime dependencies.
- Diagrams and example UI: authored in editable HTML/CSS, with simple SVG connector paths. Fictional data only.

This is a local style review, not a deployed course or a paywall. User review of the revised visual style is pending. See `review-notes.md` for observed checks and remaining limitations.
