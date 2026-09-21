# Current implementation handoff

The isolated demo is deployed, and live Calendar booking plus actual reply-driven invoice delivery are verified. The Houston demo line is **(832) 501-3799**. The third v2 call successfully invoked `upsert_inquiry` and persisted its call/inquiry association. Two availability calls and one human-follow-up call failed with HTTP 413, so full voice booking remains unverified. Repair deployment status is tracked in [docs/evidence/voice-tool-repair.json](docs/evidence/voice-tool-repair.json), and post-fix phone verification remains pending. S4U boot-trigger registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

Local verification at 15:13:37 UTC against `8a280a0` passed 87 tests in 17 files, lint, TypeScript, and the 19-file Astro check. After the separately authorized photo addition, [GitHub CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35619025879) passed for `c0aee21` at 15:28:40 UTC: 87 tests in 17 files, lint, TypeScript, 20 Astro files with zero diagnostics, and 9 pages. No local suite was repeated during this resume.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after booking cancellation and invoice replay. The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC; at 15:39:09 UTC all three were running as S4U/Limited with exact boot triggers, and all three health paths passed at 15:39:43 UTC. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update at 15:59 UTC: the voice repair is committed and focused tests passed. Windows denied direct API process control. Task Scheduler stopped the API launcher but left its old child serving; the worker and tunnel remain running. An Administrator restart through the existing stop-services script is pending. See [voice repair evidence](docs/evidence/voice-tool-repair.json) for the latest deployment result.
