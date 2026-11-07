# Handoff

## Current state

Dave approved the pilot lesson on 2026-11-07 and authorized production of the remaining course. Begin at `course/index.html`. All ten lesson pages link to locally produced videos, HTML presentations, transcripts, and captions. Source and receipt checks and video decoding passed; individual human review of lessons 2–10, captions, and beginner comprehension remains outstanding.

The portable skill lives at `course/skill/idea-to-build/` and was copied to `~/.codex/skills/idea-to-build`. Compare the two copies before changing either. Skill metadata and reference links received structural checks; a fresh reader reviewed representative behavioral scenarios. A fresh agent explicitly invoked `$idea-to-build` on a simulated ambiguous idea and produced a readback without prematurely designing it. Automatic discovery has not been independently tested.

## Resume

1. Review the remaining lessons' narration, pacing, visuals, captions, and accuracy; collect specific owner feedback and a real beginner review when possible. The videos are about 6–7 minutes each, below the original 8–15-minute target.
2. fal's public guidance permits commercial use of content generated through its API; confirm applicable account terms, any voice-specific restrictions, and actual billing before commercial launch. Reuse retained audio; reconcile any uncertain prior provider request before retrying.
3. When lesson sources change, reconcile speech hashes and request journals before generating new narration. After approved changes, regenerate HTML/media as needed and run `node course/update-manifest.cjs` to refresh the manifest and navigation companion.
4. Choose hosting and membership/payment providers; implement and test server-side entitlement checks for protected HTML and every associated media/download URL, including media seeking, cache isolation, expiry, and revocation. Until then, no paywall exists.
5. Maintain evidence, asset rights, exact voice/provider, routes and exposed usage, rollback, and a restartable handoff. Distinguish simulated review from human testing.

See `../course-design/ARCHITECTURE.md`, `BUILD_SPEC.md`, and `DECISIONS.md` for the agreed build scope and acceptance gates. `pilot/README.md` contains the pilot's reproduction commands and media limitations. The user's unrelated `.DS_Store` files were not changed.
