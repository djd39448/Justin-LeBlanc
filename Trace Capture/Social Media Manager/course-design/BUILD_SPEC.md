# Course and skill build specification

Status: draft for review · 2026-11-07. Governing design: `ARCHITECTURE.md`. This is a build contract proposal, not an instruction to begin production or proof of deployment.

## Acceptance contract

- **C-01 Audience:** A novice can explain the two loops, alignment, authorization, evidence, and the purpose of each primary document in plain language. Explain jargon when first introduced. Have a real beginner, when available, explain and apply these ideas to a short scenario; record questions, errors, and resulting revisions. If no beginner is available, use a fresh-context simulated reviewer and label that evidence as simulated rather than human learner validation.
- **C-02 Curriculum:** Ten ordered lessons cover the outcomes in the architecture. Every lesson maps objectives to lecture, worked example, exercise, rubric, and presentation. The inquiry-tracker example evolves consistently; learners may substitute their own idea.
- **C-03 Lesson package:** Each lesson has editable lesson plan, full spoken script, storyboard/scene cues, HTML lesson, animated HTML presentation, narrator audio, final video, transcript, synchronized captions, exercise, rubric, and source/rights metadata. The capstone has a complete assessment rubric.
- **C-04 Standalone content:** Navigation, links, and asset paths resolve in the selected supported hosting layout. Public content remains usable without a paid account. Protected content is never claimed secure solely because a browser hides it.
- **C-05 Accessibility:** At minimum support keyboard navigation, visible focus, readable contrast, reduced motion, meaningful headings, text equivalents for diagrams, captions, transcripts, and no forced autoplay. Test responsive layouts at phone and desktop widths and inspect representative scenes manually.
- **C-06 Visual design:** Use a consistent, engaging visual language: progressive diagrams, well-paced motion, useful examples, readable typography, and purposeful imagery. Diagrams count as imagery; use additional generated or licensed images where they help. Avoid crowded scenes. Provide editable HTML/CSS/asset sources and provenance/rights records for all assets used.
- **C-07 Voice:** Audition ElevenLabs Brian through fal.ai as the preferred pilot candidate, based on Dave's approval for a prior narrated explainer; compare other available high-quality voices if useful. Record provider, exact voice, test result, commercial-use rights, and actual exposed cost. Spark is optional pending verified access and suitability. Obtain needed authorization before paid generation and Dave's acceptance for the course voice.
- **C-08 Pilot:** Render one complete lesson end to end. Verify browser playback, synchronized visuals and audio, comprehensible narration, caption accuracy, transcript parity, correct aspect ratio/duration, and playable video via both automated inspection and human review. Record the actual time, cost, limitations, revision, chosen desktop/mobile browsers and devices, and visual/audio review results. Dave accepts the pilot or requests changes; record his decision and repeat the affected checks after revisions. Await acceptance before rendering the remaining videos, while independent content and skill work may continue.
- **C-09 Video:** Export one complete narrated video per lesson after the pilot is accepted. Retain source HTML, cue/timing data, narration, captions, rights metadata, and reproducible render instructions. File format, resolution, and codec are finalized after pilot; MP4 with a broadly compatible codec is the proposed default.
- **C-10 Paywall readiness:** Document public vs protected resources and the interface for authentication, entitlement, direct media access including range requests, signed-URL lifetime, revocation/expiry, and cache isolation. When a real access adapter is selected and implemented, prove anonymous/unentitled requests cannot retrieve protected pages or direct assets, entitled users can play and seek media, revocation applies within the documented lifetime, and caches do not leak content. Verify payment-webhook signatures and duplicate delivery if a payment integration is implemented. Until then, label protection and monetization as not implemented.
- **C-11 Skill:** Ship a portable `idea-to-build` package initially targeting Codex, with valid metadata, relative conditional references, clear explicit invocation, normal automatic discovery, and no dependency on this repository. Preserve user authority and already settled decisions. Validate package metadata and test representative ambiguous planning, already-aligned specification, authorized implementation, unavailable/limited usage, and interrupted-effect scenarios in isolated workspaces; record outcomes and negative invocation cases. Automatic invocation is best-effort. Report package creation and actual installation/discovery as separate states.
- **C-12 Shared truth:** Lesson and skill terminology agree; course examples distinguish Dave's configurable 25% reserve/75% cutoff from universal limits. Keep actual usage, unavailable models, untested integrations, and proof levels truthful.
- **C-13 Completion:** Produce a course index and restartable handoff listing all deliverables, source locations, assets/rights, selected voice, render commands, test evidence, cost/usage where exposed, limitations, and next steps. No incomplete lesson is labeled complete.

## Shared content interface

Before parallel implementation, define and version the curriculum manifest and lesson schema. Each lesson must include a unique ID, order, name, objectives, prerequisites, estimated time, and paths to the canonical plan, script, scenes/cues, exercise, rubric, transcript, captions, voice audio, HTML, video, and asset/rights record. Validate required fields and that referenced files exist; permit explicitly marked draft or pending fields until their phase is complete. The manifest controls navigation and completion checks. Maintain one authoritative terminology map shared with the skill.

For the pilot, use a provisional versioned cue interface with a scene ID, sequence, narration segment ID, start/end time in milliseconds, and accessible description; document any renderer-specific extensions. After pilot review, freeze the production interface or migrate the pilot explicitly before bulk production. The approved lecture script is the source for narration; the transcript records the final spoken audio. Reconcile any substantive mismatch and update the approved script or audio deliberately, rather than silently maintaining conflicting versions. Review captions against the final audio, including terminology, speaker and timing; record any corrections.

For the pilot, record chosen browser/device targets, video dimensions, frame rate, codec, and audio format. Inspect the start, scene transitions, captions, and ending, and listen through the complete lesson for intelligibility and alignment. Verify encoding metadata and playback duration with a media inspector. A reproducible export means rendering the same scenes and captions from retained approved narration audio, without relying on an AI provider to reproduce identical generated speech.

## Proposed production plan

1. **Preflight:** Review governing docs and source guide; establish a clean baseline, actual provider/tool access and usage, output directory, scope, and worker ownership. Do not invent model availability or token metrics.
2. **Contracts:** Finalize the terminology map, content schema, HTML/media interfaces, and delivery/access boundary. Establish the lesson-to-objective matrix.
3. **Parallel preparation:** Author lesson outlines and scripts; create HTML course/presentation implementation and media workflow; develop skill package in separate owned paths. Integrate on the shared contract.
4. **Pilot:** Select a lesson and audition voices. Produce the full package and record functional, accessibility, visual, voice, timing, rights, and cost evidence. Get Dave's feedback; revise before bulk production.
5. **Production:** Create and review each remaining lesson and video; verify references, captions, exercises, and consistency. Run only relevant checks after changes.
6. **Delivery:** Conduct a fresh-reader review, complete acceptance matrix and handoff, and present the hostable course plus editable sources and skill. Deployment and real paywall activation require a chosen provider and the applicable authorization.

## Routing, costs, and permissions

Use scripts for deterministic checks; qualified local models for suitable extraction/drafting; lower-cost capable workers for bounded ordinary tasks; strongest available conductor for architecture, integration, security, and acceptance. Give workers exclusive ownership and concise output contracts. Before substantial dispatch and after batches, check available shared usage; Dave's default is to reserve 25% of the tightest shared allowance and stop discretionary cloud dispatch at 75% used. Unknown usage is constrained. Do not assume a separate host has a separate pool, spend on filler polling, automatically redeem credits, or claim a quota is enforced without an actual mechanism.

No paid provider, credential grant, external message, deployment, publication, or purchase follows merely from this draft. Continue independent in-scope work and document exact blockers. Reconcile interrupted effects and jobs before retrying. Preserve existing unrelated work.

## Decisions required before finalizing implementation

- Course host, access/payment provider, distribution model, pricing, domain, and who owns access operations.
- Preferred evidenced voice and provider; quality, commercial rights, available credentials, and budget after audition.
- Exact presentation/video rendering toolchain, timing model, encoding settings, and production time after pilot.
- Pilot lesson selection and whether the final learner assessment requires submitting work or remains self-assessed.
- Skill installation destination and any portability requirements beyond the initial Codex package.

These are open decisions, not invitations to fabricate defaults. Develop and test the local content and pilot as far as authorized without treating an unselected paywall or paid voice as live.
