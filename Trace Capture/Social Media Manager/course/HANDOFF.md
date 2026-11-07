# Handoff

## Current state

The follow-up browser recheck found a fractional-timestamp paused-seek bug and corrected it. All 130 chapter selections now pass in the live browser, and 12 course regression tests pass. All ten video exports have been refreshed and verified against the corrected visual source; the final catalog, source fingerprints, output hashes, and evidence are reconciled. The local preview server on port 4175 is intentionally running for Dave’s requested browser review; check for that listener before starting another.

Dave accepted the course and Brian narration, approved the animated style preview, and authorized the full ten-lesson rollout. All ten HTML presentations now use the approved paper/teal/ink visual language with narration-synchronized reveals, diagrams, document examples, conversations, routing, usage gauges, and checkpoints. All ten MP4s are complete and verified, totaling 66 minutes 58 seconds and 143.44 MB at 1280 × 720, 30 fps. Their source fingerprints and output hashes match the saved reports.

Begin at `index.html`. Each lesson page links to its video, interactive HTML presentation, transcript, and captions. The browser player includes seeking, chapter navigation, captions, reduced motion, and fullscreen controls. Keep the complete `course/` folder together because presentations share local runtime and illustration assets.

The current source and production instructions are in `motion/README.md`; review coverage is in `motion/review-notes.md`; final batch evidence is in `motion/rollout-evidence.json` and each lesson’s `render-report.json`. The new offline pipeline retains all 130 original Brian clips and checks 507 original source fingerprints. It never calls a voice provider. Historical `pilot/build-pilot.cjs` and `production/build.cjs` render the superseded static style and must not be used for current visuals.

The portable skill remains at `skill/idea-to-build/`, with a personal copy at `~/.codex/skills/idea-to-build`. The prior explicit fresh-agent invocation passed; automatic skill discovery remains untested. This visual revision does not change the skill.

## Resume

1. All ten exports and the curriculum manifest are reconciled. For future visual changes, use `node course/motion/build-course.cjs render --lesson 04 --json` for a specific lesson; each completed report records the exact visual-source fingerprint. Do not regenerate unchanged narration or reset its source baseline.
2. For local review, run `node course/motion/build-course.cjs serve --port 4175 --json` from the Social Media Manager directory and open `http://127.0.0.1:4175/`. This server supports media seeking. Stop it when finished. Browser automation blocked direct `file://` navigation; live playback verification used the loopback server.
3. Detailed caption review, a complete human watch-through of the new visuals, physical-device checks, and real beginner testing are not claimed by the mechanical or representative checks. The accepted course is about 67 minutes, with lessons around 6–7 minutes.
4. Hosting and membership/payment providers remain unselected. Protect HTML and every associated media/download URL with server-side entitlement checks before selling access. No hosting deployment or paywall was implemented in this rollout.
5. Existing narration provenance and the prior public commercial-use guidance are recorded in the course documentation. Applicable account terms, voice-specific restrictions, and actual historical charges still require confirmation before commercial launch.
6. The course tests, repository lint/type checking, and static build pass. The full repository test suite still has six unrelated failures from expired October consultation fixtures in unchanged `tests/booking.test.ts` (164 tests pass); resolve those separately before claiming the broader application is green.

See `../course-design/ARCHITECTURE.md`, `BUILD_SPEC.md`, and `DECISIONS.md` for the agreed course scope and decisions. The prior package is recoverable from commit `53c76c5`; restore only intended course files and preserve unrelated work. The user’s unrelated `.DS_Store` files were not changed.
