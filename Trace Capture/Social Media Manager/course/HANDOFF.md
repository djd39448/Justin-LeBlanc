# Handoff

## Current state

Dave approved the pilot lesson on 2026-11-07 and authorized production of the remaining course. Begin at `course/index.html`, then open Lesson 1. Its playable video and interactive HTML presentation are linked on the lesson page. Check the actual files and `PROGRESS.md` for the current production state of lessons 2–10; do not infer completion from the pilot.

The portable skill lives at `course/skill/idea-to-build/` and was copied to `~/.codex/skills/idea-to-build`. Compare the two copies before changing either. Skill metadata and reference links received structural checks; a fresh reader reviewed representative behavioral scenarios. A new Codex session should explicitly invoke `$idea-to-build` and test automatic discovery separately; neither invocation was verified in the installing session.

## Resume

1. Preserve the approved pilot and produce the remaining lessons, recording any concrete defects or revisions without misrepresenting them as complete.
2. fal's public guidance permits commercial use of content generated through its API; confirm applicable account terms, any voice-specific restrictions, and actual billing before a commercial launch. Reuse retained audio; reconcile any uncertain prior provider request before retrying.
3. Resolve the versioned content/scene manifest and generate the remaining presentations, narration, captions, and MP4s using the approved production pattern. The current `curriculum.json` is an inventory; it does not yet generate the course navigation or capture every per-lesson asset, so the full shared manifest contract remains open.
4. Reconcile lesson 2–10 source records and generated HTML, verify every caption against final audio, and review on representative desktop and phone browsers.
5. Choose hosting and membership/payment providers; implement and test server-side entitlement checks for protected HTML and every associated media/download URL, including media seeking, cache isolation, expiry, and revocation. Until then, no paywall exists.
6. Complete a real beginner review where possible; distinguish simulated review from human testing. Maintain evidence, asset rights, exact voice/provider, routes and exposed usage, rollback, and a restartable handoff.

See `../course-design/ARCHITECTURE.md`, `BUILD_SPEC.md`, and `DECISIONS.md` for the agreed build scope and acceptance gates. `pilot/README.md` contains the pilot's reproduction commands and media limitations. The user's unrelated `.DS_Store` files were not changed.
