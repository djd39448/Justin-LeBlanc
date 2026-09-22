# Current implementation handoff

Round-two implementation and local acceptance are complete in
`ffb2fa00ed1465dbbbbc6ef737033f01751a157c` on pushed feature branch
`codex/justin-round-two`; the branch is not merged and the public Pages frontend remains on the
prior deployment. The new build puts the planner in
the opening homepage experience, pins navigation, adds an exact-source sanitized Public Shows
projection, accepts visitor-entered numeric USD, and removes public chat/voice/phone presentation
while preserving the assistant backends. See
[the round-two evidence](docs/evidence/round-two-2026-09-22.md),
[docs/ROUND_TWO_BUILD_SPEC.md](docs/ROUND_TWO_BUILD_SPEC.md), and [KICKOFF.md](KICKOFF.md).

The final local gate passed 137 tests in 23 files, lint/typecheck, 21 Astro files with zero
diagnostics, nine built pages, 30 Playwright passes with 15 intentional viewport skips, a clean
16-file public-output audit, and a clean secret scan. The clean baseline was 103 tests in 19 files,
20 Astro files, and nine pages. Five responsive screenshots are under
`docs/evidence/round-two/web/`.

Deployment is still gated. Windows coordination failed before a preflight could run: the Codex CLI
path was unavailable and the Claude runner had no remaining credit. No runtime or provider mutation
is claimed. Next, restore a working Windows runner, capture the current runtime/config and Pages
rollback point, deploy the additive API with `PUBLIC_EVENTS_ENABLED=false`, and verify the fixed
503 plus existing capabilities. The frontend may deploy only after the owner confirms an exact
public-performance-only Calendar, existing read access, controlled venue/city strings, and a warm
sanitized endpoint.

The isolated demo is deployed, and live Calendar booking is verified. The Houston demo line is **(832) 501-3799**. Automatic 08:00 America/Chicago invoicing is implemented, tested and loaded in the running services; fresh live current-policy delivery remains pending. The delivered reply-driven $700 invoice is historical old-policy evidence only. Retell v4, API and chat share KB `2026-09-21.4`. Full voice booking and native hangup remain unverified. S4U boot-trigger registration and task execution are verified; actual reboot/sign-out recovery remains untested.

Public and assistant booking requests are authorized before availability or hold creation, and the final Calendar adapter independently rejects any attendee outside the exact demo allowlist before OAuth or provider I/O.

[CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) passed for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10` at 17:44:56 UTC: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages.

See [docs/HANDOFF.md](docs/HANDOFF.md) for running services, exact limitations, recovery rules, and next actions. See [docs/evidence/acceptance-results.md](docs/evidence/acceptance-results.md) for the A01–A26 evidence and [docs/RUNBOOK.md](docs/RUNBOOK.md) for operator commands.

Resume from the existing private manifests and SQLite state. The provider outbox was empty after the historical booking cancellation and old-policy invoice replay. Reconcile durable identities and uncertain effects before any retry; never reset an accepted effect or resend an uncertain message blindly.

Operational update: Dave completed the Administrator restart for the no-notice release. At 16:21:06 UTC, all three health paths returned HTTP 200 with KB `2026-09-21.3`, and all three tasks were Running/S4U. At 16:21:36 UTC, a read-only website availability request accepted a same-day consultation only 68 minutes ahead with no reasons; no booking or durable count changed. Retell v3 publishes native `end_call`, which remains untested by phone. See [call-completion evidence](docs/evidence/consultation-call-completion.json).

Billing update: Retell v4, API and chat now share KB `2026-09-21.4`; all health paths passed after restart. The first `morning:auto-invoice:v2` catch-up completed seven dates with zero eligible shows and no new effects. A fresh eligible automatic invoice/email walkthrough remains pending; the blocked seed created no new show, invoice or email. See [calendar invoice workflow evidence](docs/evidence/calendar-invoice-workflow.json).
