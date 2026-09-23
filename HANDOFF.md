# Current implementation handoff

The corrected round-two conversion frontend is live at
`https://justinleblancmusic.50by50.dev/` from verified frontend revision
`9ca79d9a5afeb38c8740f768b9bae73319f1756e`, contained in both `origin/main` and
`origin/codex/justin-round-two`. Pages production deployment
`a3152e61-ed47-41a7-9595-ebd42e694245` puts the planner in the opening homepage experience, pins
navigation, accepts visitor-entered numeric USD, and removes public AI/chat/voice presentation,
package pricing, and the dormant voice-agent number while preserving the assistant backends. It
shows Justin's human business number, **(832) 303-9116**. See
[the round-two evidence](docs/evidence/round-two-2026-09-22.md),
[docs/ROUND_TWO_BUILD_SPEC.md](docs/ROUND_TWO_BUILD_SPEC.md), and [KICKOFF.md](KICKOFF.md).

The Where I'm Playing section temporarily uses one verified public listing: **Solo Sunday with
Justin LeBlanc**, Sep 27, 2026, 5:00–8:00 PM Central, at The Blue Lion Brunchery & Pub in The
Woodlands, TX. It links to the public Woodlands Online source, omits the street address, is filtered
at build time, and expires client-side after its end. The frontend makes no Calendar request. The
dedicated Public Shows Calendar remains disabled for the next QA pass, and
`/api/public-events` retains the exact fixed safe 503.

The final gate passed 146 unit/integration tests in 24 files, lint/typecheck, 21 Astro files with zero diagnostics,
nine built pages, 32 Playwright passes with 23 intentional viewport skips across five viewports, a
zero-finding public-output audit, and a clean secret scan. Feature CI run
[35805519891](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805519891) and main CI run
[35805755436](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805755436) passed. Canonical
HTTP and health checks return 200, and `/admin` retains no-store/noindex. Corrected deployment
`8d348ce1-d6f7-48f8-ad72-53dd7d856a07` is the immediate rollback target; bridge-only deployment
`5213f7b6-da9c-4985-819b-a05da8831db1` is retained as a legacy fallback.

The isolated demo is deployed, and live private Calendar booking is verified. The dormant backend
voice-agent line remains **(832) 501-3799** and is absent from public output; do not confuse it with
the visible human business number above. Automatic 08:00 America/Chicago invoicing is implemented,
tested and loaded in the running services; fresh live current-policy delivery remains pending. The
delivered reply-driven $700 invoice is historical old-policy evidence only. Retell v4, API and chat
share KB `2026-09-21.4`. Full voice booking and native hangup remain unverified. S4U boot-trigger
registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[Main CI run 35805755436](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805755436) passed for `9ca79d9a5afeb38c8740f768b9bae73319f1756e`: **146 tests in 24 files**, lint, typecheck, public-output and secret audits, 21 Astro files with zero diagnostics, nine built pages, and the Playwright matrix.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after the historical booking cancellation and old-policy invoice replay. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update: Dave completed the Administrator restart for the no-notice release. At 16:21:06 UTC, all three health paths returned HTTP 200 with KB `2026-09-21.3`, and all three tasks were Running/S4U. At 16:21:36 UTC, a read-only website availability request accepted a same-day consultation only 68 minutes ahead with no reasons; no booking or durable count changed. Retell v3 publishes native `end_call`, which remains untested by phone. See [call-completion evidence](docs/evidence/consultation-call-completion.json).

Billing update: Retell v4, API and chat now share KB `2026-09-21.4`; all health paths passed after restart. The first `morning:auto-invoice:v2` catch-up completed seven dates with zero eligible shows and no new effects. A fresh eligible automatic invoice/email walkthrough remains pending; the blocked seed created no new show, invoice or email. See [calendar invoice workflow evidence](docs/evidence/calendar-invoice-workflow.json).
