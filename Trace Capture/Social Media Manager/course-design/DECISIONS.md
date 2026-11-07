# Course decisions and open questions

Status: planning record · 2026-11-07

## Agreed direction

- Audience: beginners learning to direct AI-assisted software projects.
- Create the course and reusable workflow skill in parallel, coordinated by shared concepts and explicit file ownership.
- Build the course and presentations in HTML suitable for later hosting behind a paywall; also produce a narrated video for each lecture.
- Include a complete lesson plan and lecture per class, diagrams, images, animations, examples, and exercises. Aim for engaging, uncluttered instruction.
- Begin with the agreed ten-lesson map as a planning baseline, with a cumulative example and capstone.
- Use a high-quality AI voice for the pilot. Dave requested consulting Claude on the Mac about his prior default; Spark is available for consideration if suitable.
- Use the workflow itself: alignment, architecture/spec review, pilot and feedback, then full production with evidence and handoff.

## Proposed defaults for review

- Lessons of approximately 8–15 minutes, with additional practice time.
- Fictional inquiry tracker as the course-wide worked example; synthetic data and no real-world side effects.
- Visual language inspired by the existing guide: navy, cyan, amber, readable typography, progressive diagrams, and restrained animation.
- Browser-accessible HTML presentation as an editable source and broadly compatible MP4 as a derived delivery option, pending a successful pilot.
- Hosted access control protects paid HTML and related assets; public syllabus and chosen preview remain available. Provider remains unselected.
- A portable `idea-to-build` skill with on-demand references; add MCP only for a specific integration that warrants it.
- Audition ElevenLabs Brian via fal.ai first: Claude found Dave's 2026-11-05 approval of Brian for a narrated explainer, corroborated by local Claude feedback memory. This is a strong preference, not yet course-specific approval. The video factory's configured default was Rachel, a separate fact.

## Unresolved

- Course-specific voice approval, commercial-use rights, service access, and budget. Brian is the evidenced pilot candidate; actual availability and costs are unverified.
- Hosting, paywall/membership and payment provider, account access, pricing, domain, and launch authority.
- Pilot lesson, learner assessment format, and definitive video renderer/codec/timing approach.
- Final delivery location, exact skill installation destination, and any non-Codex compatibility requirement.

Record future decisions with date, rationale, consequences, and supersession rather than silently changing this history.

## 2026-11-07 — approved animated rollout

Dave accepted the course and Brian narration, approved the approximately 69-second animated style preview, and authorized applying it to all ten HTML presentations and videos. Preserve all 130 original narration clips. Use the accepted paper/teal/ink visual direction, phrase-timed progressive diagrams and explanations, varied teaching compositions, and a deterministic HTML timeline shared by the browser and 30 fps video export. This supersedes the earlier static scene/zoom implementation and proposed navy/cyan visual palette.

The full-course implementation lives in `../course/motion/`. It reuses the existing voice without provider calls, retains generated-source fingerprints and export evidence, and atomically replaces videos only after local verification. Accepted course length is about 67 minutes total, with lessons around 6–7 minutes. Hosting/paywall choices remain open and are outside this visual revision.
