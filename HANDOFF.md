# Current implementation handoff

The isolated demo is deployed, and live Calendar booking plus actual reply-driven invoice delivery are verified. The Houston demo line is **(832) 501-3799**. Two real inbound calls passed caller admission and signed webhook handling against the current Central-time KB; the v2 call correctly answered the consultation time zone. Neither call invoked an assistant tool or created an inquiry. No additional call is requested. Unattended Windows startup is also still pending.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

Local verification at 15:13:37 UTC against `8a280a0` passed 87 tests in 17 files, lint, TypeScript, and the 19-file Astro check. After the separately authorized photo addition, [GitHub CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35619025879) passed for `c0aee21` at 15:28:40 UTC: 87 tests in 17 files, lint, TypeScript, 20 Astro files with zero diagnostics, and 9 pages. No local suite was repeated during this resume.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after booking cancellation and invoice replay. At 15:22:32 UTC the API, worker, and tunnel tasks were running with interactive logon and logon triggers; the corrected S4U/AtStartup script had not been applied. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.
