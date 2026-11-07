# Historical narration production

Current HTML presentations and videos are built by the offline [animated course pipeline](../motion/README.md). Use that pipeline for visual changes and exports; it reuses Brian’s approved narration without a provider request.

`build.cjs` retains the original lessons 02–10 narration generation and request-journal implementation. Its render path creates the superseded static visual style and must not be used to regenerate current videos. Original `audio/`, `alignment/`, `captions/`, and `journal/` files in each lesson package remain the narration source of record. Their hashes are protected by `../motion/audio-baseline.json`.

New speech generation sends the lecture text to the configured fal.ai ElevenLabs Brian endpoint and can incur charges. An interrupted request may already have completed or been charged; reconcile its provider-side result before retrying. Do not copy credentials into artifacts. No new speech was generated for the animated rollout.

See `../motion/README.md` for current preparation, rendering, verification, local preview, and recovery commands.
