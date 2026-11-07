# From Idea to Build

A beginner course for shaping an idea into an agreed design, an agent-ready build contract, and verifiable software. Open `index.html` in a browser to explore the lessons. All ten lessons have lesson plans, lectures, exercises, self-checks, narrated videos, captions, transcripts, and HTML presentations. Dave approved the Lesson 1 pilot on 2026-11-07; lessons 2–10 are produced locally and await individual human audio/caption review and beginner validation.

## Contents

- `index.html` — course home and locally stored lesson check-ins.
- `guide.html` — a bundled snapshot of the original standalone interactive guide, so the course folder can be hosted without depending on its parent directory.
- `curriculum.json` — versioned lesson inventory, objectives, source links, and current production status. `curriculum.js` is its browser-loadable companion. Run `node course/update-manifest.cjs` from the Social Media Manager directory to reconcile and regenerate both.
- `lessons/01.html` — pilot lesson with video player, transcript link, lecture, and exercise.
- `lessons/02.html` through `10.html` — lessons linked to their generated presentations and videos. `lesson-source.mjs`, `deep-dives.mjs`, and `sample-answers.mjs` contain editable text; `render-lessons.mjs` regenerates pages 02–10.
- `pilot/` — editable presentation, scene and timing sources, retained Brian audio, captions, transcript, video, reproduction instructions, and rights/QA notes.
- `productions/02/` through `10/` — each lesson's editable presentation, narration, captions, transcript, timing, request receipts, and video. See `production/README.md` for reproduction and interruption recovery.
- `skill/idea-to-build/` — portable Codex skill and conditional references. A personal copy was installed at `~/.codex/skills/idea-to-build`; explicit invocation passed in a fresh agent, while automatic discovery remains untested.
- `PROGRESS.md` and `HANDOFF.md` — evidence and next steps.

## Preview and hosting

The course and presentations are ordinary HTML/CSS/JavaScript with local media. For local review from the `Social Media Manager` directory, run `python3 -m http.server 4173 --bind 127.0.0.1` and open `http://127.0.0.1:4173/course/`. Stop the server when finished. Browsers may restrict some media and local-storage behavior when opened directly using `file://`.

This is a local review build. There is no authentication, entitlement system, payment provider, or paywall. If deployed as-is, the lesson HTML, video, captions, audio, and downloads are accessible to anyone who can request them. Choose a host and access provider and implement/test server-side protection before selling access.

## Voice and media

The pilot uses ElevenLabs Brian through the existing fal.ai route. `pilot/README.md` records provenance, narration timing, regeneration, test results, and outstanding review. fal states that ElevenLabs content generated through its API may be used commercially; actual account terms, any voice-specific restrictions, and provider charges remain to be confirmed. Dave accepted the 7:13 pilot despite the earlier proposed 8–15 minute target.
