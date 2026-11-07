# Animated rollout review — 2026-11-07

## Content and composition

All 130 narration sections received curated visual storyboards. Two independent reviewers examined the opposite half of the course from the half they authored. Review used all-scene contact sheets and representative full-size captures, including conversation, flow, comparison, document, routing, usage gauge, and checkpoint treatments.

Corrections included separating conversation/delivery loops rather than implying one linear sequence; moving “source of truth” out of a runtime-processing path; using a document treatment for mixed component/document concepts; clearing checkpoint labels from details; replacing a flow token that covered numbers with an outlined focus ring; and removing duplicate routing-lane detail already visible in the active task card. Additional phrase-timed annotations shorten long reading holds without adding new speech.

The final mechanical layout audit inspected 838 reveal/callout/conclusion states, with no reported text clipping, collisions, subtitle-band intrusion, or browser errors. This complements visual review; it is not proof that every possible viewport has been inspected.

## Live player checks

The local range-capable server and in-app browser were used for representative Lesson 04 checks:

- Chapter selection seeks to the matching narration section and visual state.
- Play advances narration and visuals; pause leaves a stable frame and displays “Paused · Resume when you’re ready”.
- Captions toggle, reduced motion toggles, and fullscreen exposes play/pause, backward/forward five-second seeking, and exit controls.
- A 390 × 844 emulated phone viewport shows usable wrapped controls and captions outside the scaled widescreen stage, with no horizontal page overflow. This is emulation, not a physical-phone test.
- The HTML retains local assets, transcript links, and a visual outline. No voice generation or remote runtime is needed. Direct `file://` opening was blocked by the browser automation URL policy, so live playback checks used the documented loopback server; direct-file playback is not claimed as separately tested.

## Export checks

Each MP4 is accepted only after full audio/video decoding; 1280 × 720/30 fps H.264, AAC, and English subtitle checks; duration parity; unchanged original narration/alignment/receipt/caption hashes; and exact audio-packet parity with the prepared narration track. Visual-source fingerprints tie the exports to the same browser code and storyboards.

The renderer checks stable reading holds and seeking back to the same timestamp. Lessons 02 and 04 exposed single-pixel Chromium edge-rasterization variation despite identical DOM and paint waits: up to 2/255 per channel in lesson 02 and 13/255 on the left overhang of italic text in lesson 04. The audit records changed pixels, maximum channel difference, and the sum of all absolute channel differences. It permits at most four changed pixels, at most 16/255 in any channel, and at most 40 total channel-value differences together; larger differences fail. This affects at most 0.00044% of a 1280 × 720 frame. Earlier exports that passed the stricter threshold remain valid. Within-scene motion checks use decoded central content crops that exclude the progress and caption regions.

An independent source/file pass also checked 21 HTML pages, 217 local references, all 130 lecture-to-alignment hashes, cue bounds, and all 507 original source fingerprints; all passed. Source lint/format checks and the repository secret scan passed.

See `rollout-evidence.json` and each lesson’s `render-report.json` for measured results. These checks do not claim a human watched every minute, verified every caption, or tested comprehension with beginners.

## Repository-wide checks

The course’s nine regression tests now run under the repository’s Vitest runner and pass. Older supporting-course lint issues were corrected without running synthesis or historical rendering. Repository-wide ESLint and TypeScript checks pass. The broader test run reports 164 passes and six failures in unchanged `tests/booking.test.ts`: its October 1/2, 2026 consultation fixtures are now in the past, so the booking service rejects them. This belongs to the separate Justin booking application and was not changed for the course rollout. Do not describe the full repository verification as green.

## Follow-up browser recheck — 2026-11-07

Dave asked to open the finished course and double-check it. The visible file was `motion/presentation-template.html`, which is a source template rather than a generated lesson. The review opened the actual course and generated presentations using the range-capable local server.

Browser observations covered course navigation, Lesson 02 MP4 playback/pause and keyboard seeking, loaded 1280 × 720 video without media errors, visible captions, HTML conversation reveals, the Lesson 08 usage gauge, chapter navigation, fullscreen seeking, caption toggling, and reduced motion. No console errors were observed on the inspected presentation.

This pass found a real paused-seek boundary bug: the browser reports a quantized `audio.currentTime` slightly below a compiled exact sample boundary, so a chapter selection could retain the previous chapter. One observed value was 266.710203 seconds versus an intended 266.71020408163264 seconds. The chapter selector now allows 1 millisecond for media seek quantization and clamps the selected scene’s local time to zero; the approved opening receives the normalized chapter start too. The audio files and speech timing are unchanged.

After correction, all 130 chapter selections were exercised in the browser while paused, across every lesson. The selected option and rendered visual label matched on every one, including both approved-opening chapters. The regression suite now has 12 passing tests, covering the observed fractional cases, all 128 non-opening chapter boundaries, and exact start forwarding into the original opening renderer. Final exports are rerun against the corrected source fingerprints and recorded in the rollout evidence.

This is a browser interaction and boundary review, not a claim to have watched all 67 minutes continuously. The course preview is left running for Dave’s requested browser review.
