# From Idea to Build

A beginner course for shaping an idea into an agreed design, an agent-ready build contract, and verifiable software. Open `index.html` in a browser to explore the lessons. All ten lessons have lesson plans, lectures, exercises, and self-checks. Dave approved the narrated Lesson 1 pilot on 2026-11-07; production of the remaining videos is underway.

## Contents

- `index.html` — course home and locally stored lesson check-ins.
- `curriculum.json` — lesson inventory, objectives, source links, and current production status.
- `lessons/01.html` — pilot lesson with video player, transcript link, lecture, and exercise.
- `lessons/02.html` through `10.html` — lesson drafts; presentation and video production status is recorded in `PROGRESS.md`. `lesson-source.mjs`, `deep-dives.mjs`, and `sample-answers.mjs` contain editable text; `render-lessons.mjs` regenerates pages 02–10.
- `pilot/` — editable presentation, scene and timing sources, retained Brian audio, captions, transcript, video, reproduction instructions, and rights/QA notes.
- `skill/idea-to-build/` — portable Codex skill and conditional references. A personal copy was installed at `~/.codex/skills/idea-to-build`; discovery in a fresh session has not yet been observed.
- `PROGRESS.md` and `HANDOFF.md` — evidence and next steps.

## Preview and hosting

The course and presentations are ordinary HTML/CSS/JavaScript with local media. For local review from the `Social Media Manager` directory, run `python3 -m http.server 4173 --bind 127.0.0.1` and open `http://127.0.0.1:4173/course/`. Stop the server when finished. Browsers may restrict some media and local-storage behavior when opened directly using `file://`.

This is a local review build. There is no authentication, entitlement system, payment provider, or paywall. If deployed as-is, the lesson HTML, video, captions, audio, and downloads are accessible to anyone who can request them. Choose a host and access provider and implement/test server-side protection before selling access.

## Voice and media

The pilot uses ElevenLabs Brian through the existing fal.ai route. `pilot/README.md` records provenance, narration timing, regeneration, test results, and outstanding review. fal states that ElevenLabs content generated through its API may be used commercially; actual account terms, any voice-specific restrictions, and provider charges remain to be confirmed. Dave accepted the 7:13 pilot despite the earlier proposed 8–15 minute target.
