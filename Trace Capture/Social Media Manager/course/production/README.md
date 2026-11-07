# Course narration and video production

`build.cjs` builds lessons 02–10 from their canonical lecture paragraphs and the matching, curated metadata in `../scene-design/scenes.json`. It produces an editable HTML presentation, retained Brian voice audio, provider character alignments, per-scene and full WebVTT captions, transcript, scene timing, and a captioned H.264/AAC MP4 in `../productions/<lesson>/`.

The pipeline uses the same voice and motion approach as the approved pilot. The browser HTML uses entry motion; the video uses a subtle zoom on the matching HTML scene with cuts. The MP4 has embedded optional English subtitles; the VTT is also provided separately.

Run from the Social Media Manager directory with the project's existing Node/Playwright/Chromium, FFmpeg/FFprobe, and macOS VideoToolbox encoder:

```sh
node course/production/build.cjs 02 prepare
node course/production/build.cjs 02 synthesize
node course/production/build.cjs 02 render
```

`all` runs preparation, synthesis, and rendering. Preparation does not make network requests; rendering reuses saved audio and does not call the voice provider. Synthesis uses the existing configured FAL key and sends the lesson text to the existing fal.ai ElevenLabs Brian endpoint. Generation creates one request per paragraph and can incur charges. Actual billing is provider-dependent and not reported by these scripts.

Each speech request is recorded as dispatched before the external call and marked complete only after aligned audio and captions are retained. A failed or interrupted request is ambiguous; the script stops and refuses to retry it automatically. Reconcile the provider-side effect and any charge before manually resolving its journal entry. Audio with missing receipts or a changed script is also a hard stop. Do not log or commit credentials.

`frames/` and `segments/` are generated intermediates, ignored by Git; all reproducible inputs and final media are retained. `cues.json` records scene boundaries. Full human review of pronunciation, captions, pacing, account and any voice-specific commercial terms, and actual billing remains outstanding before sale or publication. fal's public [ElevenLabs page](https://fal.ai/elevenlabs) states that content generated through its API may be used commercially.
