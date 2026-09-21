# Current implementation handoff

The isolated demo is deployed, and live Calendar booking plus actual reply-driven invoice delivery are verified. The Houston demo line is **(832) 501-3799**. The third v2 call successfully invoked `upsert_inquiry` and persisted its call/inquiry association. Two availability calls and one human-follow-up call failed with HTTP 413, so full voice booking remains unverified. Repair deployment status is tracked in [docs/evidence/voice-tool-repair.json](docs/evidence/voice-tool-repair.json), and post-fix phone verification remains pending. S4U boot-trigger registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[Voice repair CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35622823710) passed for `ac22144` at 16:02:21 UTC: **94 tests in 19 files**, ESLint, TypeScript, 20 Astro files with zero errors/warnings, and nine built pages. Seven new tests cover the Retell body boundary and DST-aware assistant time conversion.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after booking cancellation and invoice replay. The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC; at 15:39:09 UTC all three were running as S4U/Limited with exact boot triggers, and all three health paths passed at 15:39:43 UTC. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update at 16:01 UTC: Dave completed the Administrator restart. All three S4U tasks are running, the API has a new process, and local/tunnel/website health passed. Signed 137 KB diagnostics now reach the call-admission and agent-ownership checks; invalid signatures and ordinary public oversized bodies are still rejected. No diagnostic call, booking, or mail was created. Two shows, one invoice, and zero unresolved effects remain. A post-fix real phone pass is still pending. See [voice repair evidence](docs/evidence/voice-tool-repair.json).
