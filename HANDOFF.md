# Current implementation handoff

The isolated demo is deployed, and live Calendar booking plus actual reply-driven invoice delivery are verified. The Houston demo line is **(832) 501-3799**. A fourth actual v2 call proved inquiry creation, four availability tool results, human-follow-up persistence, and started/ended/analyzed lifecycle handling after the body/time repair. Full voice booking and native hangup remain unverified. API, chat, and the same protected Retell identities now share KB `2026-09-21.3`. See [call-completion evidence](docs/evidence/consultation-call-completion.json). S4U boot-trigger registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[Consultation-policy CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35624105352) passed for `e8b66cda1bfc473320c44dbc53bb28509c993800` at 16:13:44 UTC: **98 tests in 19 files**, ESLint, TypeScript, 20 Astro files with zero errors/warnings, and nine built pages.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after booking cancellation and invoice replay. The corrected startup upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC; at 15:39:09 UTC all three were running as S4U/Limited with exact boot triggers, and all three health paths passed at 15:39:43 UTC. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update: Dave completed the Administrator restart for the no-notice release. At 16:21:06 UTC, all three health paths returned HTTP 200 with KB `2026-09-21.3`, and all three tasks were Running/S4U. At 16:21:36 UTC, a read-only website availability request accepted a same-day consultation only 68 minutes ahead with no reasons; no booking or durable count changed. Retell v3 publishes native `end_call`, which remains untested by phone. See [call-completion evidence](docs/evidence/consultation-call-completion.json).
