# Current implementation handoff

The two-step, inquiry-only public planner is live at
`https://justinleblancmusic.50by50.dev/` from verified frontend revision
`c6abf12015bcb6ef179985a08919cd3319026915`, on both `origin/main` and
`origin/codex/justin-round-two`. Pages production deployment
`73a78aec-f10a-4b95-b494-fd191ecccbd6` serves the release;
`a3152e61-ed47-41a7-9595-ebd42e694245` is the immediate rollback target. The public browser ends
after inquiry/human-follow-up confirmation and contains no consultation, availability, booking, or
tentative-hold surface, while the protected backend remains intact. See
[the public-form evidence](docs/evidence/public-form-simplification-2026-09-23.md) and
[the public-form specification](docs/PUBLIC_FORM_SIMPLIFICATION_SPEC.md).

The Where I'm Playing section temporarily uses one verified public listing: **Solo Sunday with
Justin LeBlanc**, Sep 27, 2026, 5:00–8:00 PM Central, at The Blue Lion Brunchery & Pub in The
Woodlands, TX. It links to the public Woodlands Online source, omits the street address, is filtered
at build time, and expires client-side after its end. The frontend makes no Calendar request. The
dedicated Public Shows Calendar remains disabled for the next QA pass, and
`/api/public-events` retains the exact fixed safe 503.

The final gate passed 146 unit/integration tests in 24 files, lint/typecheck, 21 clean Astro files,
nine built pages, 34 Playwright passes with 26 intentional viewport skips across five viewports, a
zero-finding 15-file public-output audit, and a clean secret scan. Feature CI run
[35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) and main CI run
[35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed. Canonical,
`/plan-your-event/`, deployment URL, and health checks return 200; `/api/admin/state` returns 401,
and `/admin` retains no-store/noindex. No inquiry was submitted during live smoke.

The isolated demo is deployed, and live private Calendar booking is verified. The dormant backend
voice-agent line remains **(832) 501-3799** and is absent from public output; do not confuse it with
the visible human business number above. Automatic 08:00 America/Chicago invoicing is implemented,
tested and loaded in the running services; fresh live current-policy delivery remains pending. The
delivered reply-driven $700 invoice is historical old-policy evidence only. Retell v4, API and chat
share KB `2026-09-21.4`. Full voice booking and native hangup remain unverified. S4U boot-trigger
registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[Main CI run 35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617) passed for `c6abf12015bcb6ef179985a08919cd3319026915` after [feature CI run 35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911) passed.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after the historical booking cancellation and old-policy invoice replay. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update: Dave completed the Administrator restart for the no-notice release. At 16:21:06 UTC, all three health paths returned HTTP 200 with KB `2026-09-21.3`, and all three tasks were Running/S4U. At 16:21:36 UTC, a read-only website availability request accepted a same-day consultation only 68 minutes ahead with no reasons; no booking or durable count changed. Retell v3 publishes native `end_call`, which remains untested by phone. See [call-completion evidence](docs/evidence/consultation-call-completion.json).

Billing update: Retell v4, API and chat now share KB `2026-09-21.4`; all health paths passed after restart. The first `morning:auto-invoice:v2` catch-up completed seven dates with zero eligible shows and no new effects. A fresh eligible automatic invoice/email walkthrough remains pending; the blocked seed created no new show, invoice or email. See [calendar invoice workflow evidence](docs/evidence/calendar-invoice-workflow.json).
