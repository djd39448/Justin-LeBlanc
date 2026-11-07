# Progress

## 2026-11-07 — approved animated rollout

- Dave approved the animated style preview and authorized applying it to all ten HTML presentations and videos, preserving Brian’s existing narration.
- Completed 130 curated narration sections with 563 phrase-timed item reveals and 19 teaching callouts. Ten visual treatments include staged conversations, progressive workflows, document construction, comparisons, routing, usage gauges, evidence, and checkpoints. Lesson 1 retains the approved opening.
- All ten HTML presentations and MP4s are complete: 66 minutes 58 seconds, 143.45 MB, 1280 × 720 at 30 fps. Every export passed full decoding, stream/timing checks, original-source checks, exact AAC packet comparison, meaningful within-scene motion verification, and current-source/output fingerprint checks.
- All 507 retained source files, including 130 original MP3s, remain byte-for-byte unchanged. No narration rewrite, new speech generation, or voice-provider request.
- Independent composition review covered all 130 sections. The layout audit passed 838 states; a separate integration review passed 21 pages, 217 local references, lecture/alignment hashes, and cue bounds. Representative browser checks covered chapter seeking, playback/pause, captions, reduced motion, fullscreen, and a 390 × 844 viewport.
- Offline pipeline regression tests, targeted lint/format checks, and the secret scan passed. `motion/review-notes.md` records coverage and the tightly bounded Chromium pixel-rasterization tolerance. Final batch measurements are retained in `motion/rollout-evidence.json`. Repository-wide lint, type checking, and build pass; the broader test run reports 164 passes and six unrelated failures from expired October consultation fixtures in unchanged `tests/booking.test.ts`. The nine course regression tests pass under the repository Vitest runner.
- Three scoped Codex workers handled storyboards and offline production. Shared allowance was 47% used at the opening check and 51% at the latest checkpoint; exact per-worker model/token use was not exposed. All media rendering ran locally. No reset credits were redeemed.
- Detailed human caption review, real beginner comprehension, physical-device testing, and hosting/paywall integration remain separate from this completed visual design and export work.

## 2026-11-07 — animated style preview

- Dave accepted the course and Brian narration, then requested more engaging visual teaching and authorized a 60–90-second style preview before a course-wide rollout.
- Created `style-preview/` from the first two retained narration clips: approximately 69 seconds, seven varied compositions, an original fictional performer illustration, phrase-timed reveals, moving inquiry examples, and a progressively explained diagram.
- A deterministic HTML timeline drives both the browser presentation and the 30 fps MP4 export. The package includes captions, transcript, source timing and fingerprints, a range-capable local server, reproduction commands, and review evidence.
- Browser checks covered playback, seeking, captions, reduced motion, fullscreen controls, and an emulated phone viewport. Independent review led to fixes for duplicate-example ambiguity, caption clearance, contrast, and controls. See `style-preview/review-notes.md` and `render-report.json` for details.
- At this earlier milestone the preview awaited review. Dave subsequently approved it and authorized the full rollout recorded above.

## 2026-11-07 — pilot accepted

- Dave approved the Lesson 1 pilot and authorized the remaining course production.
- A fresh agent explicitly invoked the installed `idea-to-build` skill on an ambiguous simulated project and returned the requested readback before proposing architecture. Automatic discovery remains untested.
- fal's [ElevenLabs page](https://fal.ai/elevenlabs) states that content generated through its API can be used commercially; confirm the account's terms and any voice-specific restrictions before launch. [Published Multilingual v2 pricing](https://fal.ai/pricing) is $0.10 per 1,000 characters at this checkpoint; actual account charges are not exposed.
- Produced lessons 2–10 from the approved Brian voice and visual model: 117 completed scene receipts, matching script hashes, VTT captions, editable HTML presentations, transcripts, cue manifests, and H.264/AAC MP4s with English subtitle tracks. Full video decoding and stream checks passed. Lessons 2–10 total about 59 minutes 46 seconds; with the 7:13 pilot the course is about 67 minutes. Each lesson is around 6–7 minutes, below the earlier proposed 8–15-minute target.
- The nine scripts contain approximately 56,800 characters. At the published $0.10 per 1,000 characters, a single narration pass is approximately $5.68; actual account charges were not exposed and may differ.
- Reconciled a versioned curriculum manifest and browser companion against the local lesson and media assets; the course index reads the manifest and retains a static fallback.
- Human listening, caption review, individual lesson review, real beginner testing, account billing, and any voice-specific commercial restrictions remain unverified. The course has not been hosted and has no paywall.

## 2026-11-07 — earlier pilot and lesson-draft milestone

- Created the course homepage, lesson navigation, responsive styling, and browser-local self-reported completion controls.
- Drafted all ten beginner lessons with objectives, lesson plans, lectures, exercises, and rubrics. Lessons 2–10 remain drafts and have no narrated presentations or videos yet.
- An independent beginner-focused review led to concrete sample answers, clearer instructions for saving and reopening work, corrected exercise/rubric mismatches, honest evidence labels, and a 2–4 hour capstone estimate. A live novice has not yet reviewed the course.
- Generated the Lesson 1 pilot with 13 Brian narration clips, an interactive HTML presentation, a 7:13 H.264/AAC MP4, an English caption track and separate WebVTT, transcript, timing data, and reproducible rendering source. The MP4 uses slowly animated captures of the HTML scenes, while the live HTML adds entry animation.
- Created the portable `idea-to-build` skill and installed a matching personal copy. A fresh-context static review covered ambiguous discovery, already-aligned work, explicit build authorization, usage constraints, recovery, and routine-task triggering. The reviewer identified unclear handling for unobservable usage, which was corrected. This is not evidence of a full fresh-session invocation test.
- Usage observed at dispatch: Codex shared allowance 44% used; other routes and actual fal.ai audio cost were not exposed here. No reset credit redeemed.
- Pending: Dave's review of the pilot voice, pace, visual style, captions, and content; full beginner comprehension testing; commercial voice rights and billing; lesson 2–10 production; live hosting and access controls.
