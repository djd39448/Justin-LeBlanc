# Style preview review evidence

Review date: 2026-11-07. Scope: the first two approved Lesson 1 narration paragraphs, 68.6498 seconds. Dave's course and narration approval is retained; acceptance of this new visual treatment is pending.

## Observed

- Original MP3 clips were decoded and joined without generating or rewriting speech. Source text/alignment hashes matched. Exact sample counts, original MP3 fingerprints, and derived audio fingerprints are in `timing.json`.
- Thirteen deterministic scene captures were reviewed across the opening, tracker, coding example, question sequence, decisions, three-stage journey, and ending. An independent agent reviewed the storyboard, source and representative frames.
- Review corrections retained all three inquiries, cleared the caption area, made inactive diagram labels more readable, and added playback/seek/exit controls inside fullscreen. A final small correction moved the example label above the caption band before the final export.
- In-app browser checks on the Mac confirmed playback, pause, chapter jumps, seek, caption on/off, fullscreen controls, and reduced-motion mode. At a question boundary, reduced motion showed the current question while future questions remained hidden. No console errors or horizontal overflow were observed in the tested desktop view.
- At an emulated 390×844 viewport, controls wrap without clipping and captions display separately at 16px. The visual stage retains its video proportions; fine diagram labels are best viewed in landscape or on a larger screen. This was browser viewport emulation, not a physical phone test.
- The static Python preview server did not advertise usable media seek ranges in the native browser. The supplied Node `serve` command fixes this with GET/HEAD byte-range responses. Tests covered bounded, open and suffix ranges plus invalid ranges.
- The MP4 renderer captures the actual animation at 30 fps from the same `renderAt(seconds)` function as HTML playback. It does not apply a camera zoom to one still per paragraph. The final render's stream, decode, duration and source checks are recorded in `render-report.json`. The completed 3.10 MB MP4 also opened and played in the Mac in-app browser. Six decoded content crops during reveals changed independently of the progress bar; the exported AAC packets match the prepared narration exactly.

## Production and scope

The coordinator authored the scene presentation and integrated the work. Two bounded Codex subagents handled offline media production and independent review. Exact subagent model names and per-worker token charges were not exposed. The shared Codex allowance was 46% used before dispatch and 47% after the batch; no reset credits or new voice-provider requests were used. One fictional performer illustration was produced with the built-in image-generation tool; prompt and project asset path are retained.

The old course videos and original recordings have not been replaced. This excerpt is a proposed visual standard for user review, not evidence that all ten lessons have received the new treatment. Hosting, paywall configuration, physical-device testing, and beginner comprehension evaluation remain outside this preview.
