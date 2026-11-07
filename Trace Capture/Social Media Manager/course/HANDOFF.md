# Handoff

## Current state

Dave subsequently accepted the course and narrations but requested a more active visual presentation. He authorized a 60–90-second excerpt for review before applying it to the remaining course. The separate `style-preview/index.html` and `style-preview/style-preview.mp4` pair the first two existing Brian clips (approximately 69 seconds) with progressive animation and varied compositions. Review this package next; the course-wide visual revision is not yet approved. Source, reproduction commands, provenance, and evidence are in `style-preview/README.md`, `review-notes.md`, and `render-report.json`. No new narration was generated and no original lesson video was replaced.

Dave approved the pilot lesson on 2026-11-07 and authorized production of the remaining course. Begin at `course/index.html`. All ten lesson pages link to locally produced videos, HTML presentations, transcripts, and captions. Source and receipt checks and video decoding passed. Dave has accepted the course and narration; detailed caption verification and beginner comprehension testing remain outstanding.

The portable skill lives at `course/skill/idea-to-build/` and was copied to `~/.codex/skills/idea-to-build`. Compare the two copies before changing either. Skill metadata and reference links received structural checks; a fresh reader reviewed representative behavioral scenarios. A fresh agent explicitly invoked `$idea-to-build` on a simulated ambiguous idea and produced a readback without prematurely designing it. Automatic discovery has not been independently tested.

## Resume

1. Collect Dave's review of the separate animated style preview, then apply the accepted visual direction to the authorized lesson scope. Course and narration have been accepted; physical-device, detailed caption, and real beginner checks are still useful. The original videos are about 6–7 minutes each, below the original 8–15-minute target.
2. fal's public guidance permits commercial use of content generated through its API; confirm applicable account terms, any voice-specific restrictions, and actual billing before commercial launch. Reuse retained audio; reconcile any uncertain prior provider request before retrying.
3. When lesson sources change, reconcile speech hashes and request journals before generating new narration. After approved changes, regenerate HTML/media as needed and run `node course/update-manifest.cjs` to refresh the manifest and navigation companion.
4. Choose hosting and membership/payment providers; implement and test server-side entitlement checks for protected HTML and every associated media/download URL, including media seeking, cache isolation, expiry, and revocation. Until then, no paywall exists.
5. Maintain evidence, asset rights, exact voice/provider, routes and exposed usage, rollback, and a restartable handoff. Distinguish simulated review from human testing.

See `../course-design/ARCHITECTURE.md`, `BUILD_SPEC.md`, and `DECISIONS.md` for the agreed build scope and acceptance gates. `pilot/README.md` contains the pilot's reproduction commands and media limitations. The user's unrelated `.DS_Store` files were not changed.
