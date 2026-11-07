# Course and skill architecture

Status: proposed for Dave's review · 2026-11-07

## Outcome and scope

Teach beginners to turn an imprecise software idea into an agreed architecture, agent-ready specification, verified implementation, and restartable handoff. Deliver a hostable HTML course, an editable animated HTML presentation and narrated video for every lesson, and a reusable `idea-to-build` skill. The course and skill are parallel workstreams governed by a shared vocabulary and reviewed together.

This document is a proposal, not evidence that course production, a live paywall, the skill, or a video pipeline exists. Planning and approval of this document do not by themselves deploy or publish a site, buy services, grant credentials, or enroll customers.

## Learner experience

The learner needs no prior programming experience. Explain technical terms on first use, show the concrete reason for each artifact, and let learners apply the process to their own idea. A fictional inquiry tracker supplies a single, safe example from brain dump to handoff; example data are synthetic.

Start with ten short lessons, targeting 8–15 minutes of narration each. Each lesson has an outcome, lecture, animated presentation, transcript and captions, worked example, practice exercise, and assessment rubric. Lessons 1–9 contribute artifacts to the final capstone; Lesson 10 assembles and evaluates a complete agent-ready package. Learners can revisit the original interactive guide and copy adaptable prompts.

| #   | Lesson                         | Demonstrated outcome                                       | Practice artifact                              |
| --- | ------------------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| 1   | The whole system               | Explain the conversation and delivery loops                | Map an idea to stages                          |
| 2   | Brain dump to alignment        | Request and correct an observable readback                 | Agreed outcome and journey                     |
| 3   | Research and decisions         | Separate current truth from assumptions and lock choices   | Reality scan and decision ledger               |
| 4   | Architecture and workflows     | Map components, data, boundaries, and failures             | Architecture and workflow diagram              |
| 5   | Documents with distinct jobs   | Explain authority, history, specs, logs, and handoffs      | Documentation map                              |
| 6   | Build specification and plan   | Define behavior, acceptance, dependencies, and ownership   | Build spec, acceptance matrix, task plan       |
| 7   | Coding standards and evidence  | Evaluate code, tests, failures, and proof claims           | Review and verification checklist              |
| 8   | Kickoff, routing, and usage    | Authorize bounded work and select available capable routes | Kickoff and usage/routing plan                 |
| 9   | Autonomous builds and recovery | Persist progress, manage blockers, and safely resume       | Overnight contract, checkpoint, morning report |
| 10  | Capstone                       | Assemble and assess a coherent end-to-end package          | Agent-ready package and rubric review          |

Learners see the alignment gate before architecture, and an explicit authorization gate before building when the task calls for one. Teach the distinction between implemented, offline-tested, provider-accepted, and live-observed. Dave's 25% reserve and 75%-used discretionary-dispatch cutoff are configurable personal defaults, not universal provider limits. State when usage is unavailable; never imply an agent can enforce a quota it cannot observe.

## Content and presentation architecture

Maintain one versioned curriculum manifest as the index of ordered lessons and their artifacts. A lesson has a stable ID, title, objective, prerequisite, estimated duration, lesson plan, lecture script, scene/cue data, exercise and rubric, transcript, captions, media and asset references, and status. References are relative to the course root and resolve to editable source files. Rendered pages and videos are derived outputs; edits originate in their canonical sources.

```text
Curriculum manifest + shared vocabulary
  ├─ Lesson sources → HTML lesson pages and exercises
  ├─ Script + scene/cue data → animated HTML presentation
  │                              └─ narration + timing → captioned video export
  └─ Shared concepts → skill references and cross-review
```

The HTML course supports a landing page, syllabus, lesson navigation, presentation, video, transcript, exercises, and downloadable resources. HTML presentations are editable and viewable independently in a modern browser. They use progressive diagrams, restrained motion, clear contrast, keyboard-accessible controls, and reduced-motion support. Captions and a text transcript are available alongside each video. No autoplay; the learner can pause, replay, and navigate. Responsive layouts cover phone and desktop.

Choose the HTML-to-video renderer only after a pilot demonstrates synchronization, reproducibility, quality, and reasonable cost. HTML, fonts, illustrations, diagrams, audio, captions, and final encodes must have traceable rights and source paths. A manifest or cue sheet records narration-to-scene timing; avoid maintaining unrelated versions of the lecture in multiple places.

## Voice and media

Dave requested a high-quality AI voice and asked Claude on this Mac to identify his existing default. Claude located a 2026-11-05 narrated-explainer decision and local feedback memory identifying ElevenLabs **Brian** through fal.ai; Dave approved Brian for that explainer. Treat this as the preferred pilot candidate, not a course-specific final acceptance. The video factory's configured default was a different voice, Rachel. Availability, commercial-use rights, and actual cost for the course remain unverified. Spark may be evaluated if useful; its capabilities and access are unverified. Audition Brian in the pilot and compare alternatives only if useful, using the same short sample and a documented selection. Do not clone a voice without the person's consent, generate paid audio without appropriate authorization, or claim the course voice is finally accepted before Dave reviews it.

For the pilot, create one complete representative lesson, with a short voice/visual sample first when useful. Review the script and actual audio/video for intelligibility, pronunciation, visual clarity, synchronized timing, accessibility, and beginner comprehension. Measure duration, rendering time, and exposed costs before approving a full production estimate.

## Hosting and paywall boundary

Produce normal hostable HTML and media. Public marketing, syllabus, and any deliberately chosen preview can be served without authentication. Paid lesson pages, HTML presentation sources, videos, captions, transcripts, exercises, and downloads must be protected by the eventual host or membership service, including direct asset URLs. A client-side hidden section, a JavaScript password, or an unlinked static file is not access control.

The hosting/membership/payment provider, domain, pricing, access model, and launch timing are unresolved. Specify an interface for identity, entitlement checks, protected assets, expiration/revocation, and safe caching; select and test a real adapter only when the provider and authority are established. Any payment webhook must be authenticated and idempotent. A local demonstration is labeled as such; it must not be described as a live paywall. Access controls cannot prevent a legitimately authorized viewer from copying what they can see.

## Reusable skill architecture

Proposed package name: `idea-to-build`. Its compact `SKILL.md` describes when to invoke it, determines the current stage from the request and existing documents, and guides capture, readback, research, decisions, architecture, spec, authorization, delivery, verification, and handoff as appropriate. It must honor existing agreement and existing user authorization rather than restart the process or require redundant approval.

Load conditional references only when relevant: discovery and architecture; specification and delivery; routing, usage, and autonomy. Include prompt examples or templates only where they demonstrably help. Do not hard-code this repository, proprietary project content, specific provider availability, or machine paths. Preserve user's instructions and host permissions. Enable explicit invocation and normal implicit discovery, acknowledging that automatic selection is not guaranteed. Use scripts only for a concrete repeatable need. MCP is deferred unless a specific external capability requires it.

Maintain a portable, versioned project copy as the source. Installation to a personal skill directory is a separate execution step during the authorized build. Skill and course use a shared terminology contract, with separate ownership and integration review.

## Workstreams and dependencies

1. **Shared contract:** lock terminology, lesson IDs, content schema, interfaces, voice requirements, and review gates.
2. **Course content:** develop curriculum, beginner examples, lesson plans, scripts, exercises, and rubrics.
3. **HTML/media:** build the course shell, presentation engine, pilot narration and rendering workflow, captions, and production packaging.
4. **Skill:** build the portable package and references; test invocation, stage awareness, authority boundaries, usage handling, and recovery in isolated scenarios.
5. **Integration:** conduct pilot review, synchronize terminology, complete remaining lessons and exports, and document hosting boundaries and handoff.

Content and skill work can proceed in parallel after the shared contract. Presentation implementation can proceed against the agreed content interface; final video production depends on pilot and voice review. Do not assign overlapping files to parallel workers.

## Evidence and handoff

The build must record actual models and tools, usage when exposed, source and version of each asset, verification commands and results, selected voice and rights, pilot findings, access-control status, exact output paths, unverified claims, and next actions. Keep progress and changelog records accurate and incremental. A fresh agent should be able to regenerate the course and identify every remaining blocker without relying on chat memory.
