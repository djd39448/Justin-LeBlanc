# Acceptance and evidence matrix

Implementation and verification status: see the dated [A01–A26 results](evidence/acceptance-results.md). Live Calendar booking and actual reply-driven invoice delivery are verified. The third admitted v2 call successfully invoked `upsert_inquiry` and persisted its association; availability failed twice and human follow-up failed once with HTTP 413. The repair is deployed and live signed HTTP diagnostics passed; full voice booking remains unverified pending post-fix phone evidence. S4U boot-trigger registration and task execution are verified; recovery after an actual reboot/sign-out remains untested. Requirements below are unchanged; do not mark a row passed without linked evidence.

| ID | Scenario | Required result |
|---|---|---|
| A01 | Design references/baseline | 3–5 browsed examples, dated observations, retained Justin identity |
| A02 | Mobile/desktop | 360/390/768/1280/1440 screenshots; no overflow, blocked CTA or form controls |
| A03 | Accessible form | Keyboard steps/errors/back/edit, unknown date flow, consent, server validation |
| A04 | Agent-readable page | Useful initial HTML, matching structured data, reference page, sitemap; demo noindex |
| A05 | Pricing | Exact integer totals, duration/travel rules, unknown route -> no invented charge |
| A06 | Shared KB | Same release/hash in voice/chat; source-grounded answers; unknown -> follow-up |
| A07 | Sales behavior | Both assistants qualify and offer booking without unsupported promises |
| A08 | Cross-channel intake | One inquiry, secure association, correction/resume; no private record exposure |
| A09 | Calendar | Consultation + tentative show, correct zones, Dave/client invites, no duplicate invites |
| A10 | Conflicts/races | Two callers contend for same interval: at most one active hold; buffers enforced |
| A11 | Partial failure | One calendar write/email fails; accurate pending state, reconcile without duplicate |
| A12 | Brief | Attractive one-page HTML/PDF delivered to operator, fields and unknowns legible |
| A13 | Operator confirmation | Approved quote converts existing hold to confirmed; audit and attendee update |
| A14 | Cancel/reschedule/expiry | Only demo-owned records change; availability released, cancelled show not billed |
| A15 | Morning job | Yesterday's ended shows, not newly created bookings; DST, midnight, recurrence, catch-up |
| A16 | Actual YES reply | Authenticated/correlated Gmail reply triggers one invoice for agreed amount |
| A17 | NO reply | Not performed, no invoice or assumed cancellation charge |
| A18 | Changed invoice | Candidate amendment -> visible revised total -> explicit approval -> exact invoice |
| A19 | Bad/absent reply | Ambiguous, forged, wrong thread, auto-reply, missing fields: no invoice |
| A20 | Deduplication | Duplicate job/webhook/reply/send timeout never creates duplicate invoice; uncertain sends reconcile |
| A21 | Delivery | Test client receives readable PDF/email; configured operator receives BCC; no public link |
| A22 | Auth and abuse | Public cannot confirm/price/issue/read private data; signed webhooks, rate/recipient limits |
| A23 | Provider isolation | Before/after manifest proves existing Retell/Telnyx/DNS/TrustCore workflows unchanged |
| A24 | Hosting | Requested HTTPS hostname, separate project/API, persistent DB, backup/restore evidence |
| A25 | Operations | CLI --help/--json, jobs/retries/kill switches, redacted health/errors, resource registry |
| A26 | Handoff | Reproducible install/build, migrations/export, current runbook, private Git remote verified |

## Test layers

Offline unit/domain tests: quotes, transitions, auth gates, dates/timezones/DST, money, reply grammar,
idempotency keys, invoice snapshots. Real local SQL transactions for state/race tests. Provider
contract fixtures for Cal.com, Calendar, Gmail/IMAP and Retell; raw-body signature verification.
Playwright covers user journey plus keyboard/mobile and errors. Visual PDF checks use synthetic data.
Opt-in live smoke suite uses actual isolated integrations and allowlisted test recipients.
Build/lint/typecheck must pass before code commits; docs commits use whitespace/link/secret checks.

## Demo rehearsal (one continuous pass)

1. Open live site on phone viewport; hear/watch verified sample or inspect honest source link.
2. Ask chat about a private celebration, answer discovery prompts, see labeled estimate.
3. Call the demo number, ask a sourced FAQ and qualify an inquiry through the same backend.
   Securely associate it with the test inquiry or demonstrate a separate synthetic record;
   don't merge on name alone. Finish one chosen record through the full lifecycle.
4. Choose consultation and event date; inspect both invitation emails and private one-page brief.
5. Operator approves agreed quote and confirms show; verify updated event.
6. Use explicit demo time simulation / seeded past instance and run the real morning logic.
7. Reply YES to the actual confirmation email. Observe invoice in test client inbox and BCC.
8. Replay job/reply; verify no second invoice. Show NO and amendment cases using offline evidence.

Record UTC timestamp, commit SHA, provider/resource IDs (redacted appropriately), commands,
pass/fail and sanitized artifact links in `docs/evidence/acceptance-results.md`. Mark separately
implemented, offline-tested, live-tested. Failure or missing access is not a pass.
