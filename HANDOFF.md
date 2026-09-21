# Current implementation handoff

The isolated demo is deployed, and live Calendar booking is verified. The Houston demo line is **(832) 501-3799**. Automatic 08:00 America/Chicago invoicing is implemented, tested and loaded in the running services; fresh live current-policy delivery remains pending. The delivered reply-driven $700 invoice is historical old-policy evidence only. Retell v4, API and chat share KB `2026-09-21.4`. Full voice booking and native hangup remain unverified. S4U boot-trigger registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) passed for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10` at 17:44:56 UTC: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after the historical booking cancellation and old-policy invoice replay. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update: Dave completed the Administrator restart for the no-notice release. At 16:21:06 UTC, all three health paths returned HTTP 200 with KB `2026-09-21.3`, and all three tasks were Running/S4U. At 16:21:36 UTC, a read-only website availability request accepted a same-day consultation only 68 minutes ahead with no reasons; no booking or durable count changed. Retell v3 publishes native `end_call`, which remains untested by phone. See [call-completion evidence](docs/evidence/consultation-call-completion.json).

Billing update: Retell v4, API and chat now share KB `2026-09-21.4`; all health paths passed after restart. The first `morning:auto-invoice:v2` catch-up completed seven dates with zero eligible shows and no new effects. A fresh eligible automatic invoice/email walkthrough remains pending; the blocked seed created no new show, invoice or email. See [calendar invoice workflow evidence](docs/evidence/calendar-invoice-workflow.json).
