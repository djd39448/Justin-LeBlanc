# Acceptance and evidence matrix

Implementation and verification status: see the dated [A01–A26 results](evidence/acceptance-results.md). Calendar-driven automatic invoicing is implemented, CI-verified and loaded in the running services; a fresh live Calendar-to-inbox walkthrough remains pending. The delivered $700 reply-driven invoice is historical evidence for the superseded policy. Retell v4, API and chat share billing-policy KB `2026-09-21.4`. Phone verification of completed booking and native `end_call` remains pending; recovery after an actual reboot/sign-out remains untested. Do not mark a row passed without linked evidence.

## Round-two acceptance — pending implementation

The rows below are owner-approved requirements from 2026-09-22. They are all pending until a new
dated evidence record proves them. Existing A01–A26 results remain unchanged.

| ID    | Scenario                 | Required result                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-01 | Immediate conversion     | At 1440×900, Justin's identity/value proposition and usable first planner controls are in the initial viewport. At 390×844, the planner begins in or immediately against the concise hero. No CTA, modal, menu choice, route change, assistant, or preliminary reveal is required.                                                                              |
| R2-02 | Persistent navigation    | Header remains attached to the viewport after at least two viewport heights of scrolling at desktop/mobile widths; it never covers anchors, validation errors, headings, or focused controls.                                                                                                                                                                   |
| R2-03 | Brand/hero               | One H1 is Justin LeBlanc; exact approved opening line, left subject/right-lower copy, unobstructed face, safe crop, dark seamless fade, no Hear Justin First or source link.                                                                                                                                                                                    |
| R2-04 | Structure                | DOM order is pinned header → hero/inline planner → category rail → live public dates → Listen → Follow → FAQ → return-to-planner prompt → footer; no duplicate form.                                                                                                                                                                                            |
| R2-05 | Form changes             | Preferred Reply is Email/Text/Phone Call; Text and Phone Call require phone. Page-three timezone and Venue Access are hidden while Central Time and `access: "unknown"` persist. Special Requests and exact PA options render.                                                                                                                                  |
| R2-06 | Numeric budget           | Optional USD text/decimal input enforces the exact grammar and upper bound in the round-two spec, converts digits to exact integer cents without floating point, handles legacy resume without inventing a numeric value, formats in the private brief, and never changes estimate/quote/invoice arithmetic.                                                    |
| R2-07 | Exact Calendar source    | Public listing reads only the exact configured Public Shows Calendar. It never reads or falls back to private booking, free/busy, primary, family, or discovered Calendars and never calls provider write endpoints.                                                                                                                                            |
| R2-08 | Calendar privacy         | A multi-calendar fixture places private wedding/corporate/consultation/hold events on forbidden sources and eligible/cancelled/malformed events on Public Shows. Only the exact public source is queried and only its eligible event returns. A valid Public Shows event is public regardless of title; no metadata inference authorizes publication.           |
| R2-09 | Sanitized event DTO      | Output contains only versioned opaque ID, bounded title, controlled venue/city-region display, start/end, timezone, freshness status, and timestamp. V1 emits no source URL. No raw provider IDs, Calendar IDs, descriptions, attendees, organizer/email, conferencing, attachments, extended properties, booking/customer/show IDs, private address, or money. |
| R2-10 | Calendar behavior        | The exact 180-day/4-page/100-output bounds, timed-event mapping, v1 HMAC ID, five-minute fresh/24-hour stale cache, eight-second timeout, recurrence, cancellation, cross-midnight, DST, HTTP 200/503 contracts, loading/empty/stale/unavailable UI, and fail-closed behavior pass.                                                                             |
| R2-11 | No public assistants     | Built public HTML, JS, metadata, sitemap, `llms.txt`, reference content, and health/config payloads contain no chatbot/voice UI, phone number, `tel:` URL, assistant CTA, availability call, or assistant marketing copy.                                                                                                                                       |
| R2-12 | Backend preserved        | Existing Retell/OpenAI identities, number, KB/tools including `estimate_event`, routes, webhooks, configuration, signatures, limits, allowlists, and backend tests remain intact and passing; no provider reprovision occurs.                                                                                                                                   |
| R2-13 | Public copy/pricing      | No public package/demo prices or engineering-oriented demo/operator copy remains; visitor budget is clearly non-binding planning context. FAQ uses first-person approved facts only.                                                                                                                                                                            |
| R2-14 | Responsive/accessibility | 360/390/768/1280/1440 evidence shows pinned navigation, visible planner start, correct hero crop, accessible form/Calendar states, 44px controls, 16px form text, AA contrast, visible focus, reduced motion, and no horizontal overflow.                                                                                                                       |
| R2-15 | Build/deployment         | `npm run verify`, browser tests, public-output privacy/copy audit, and secret scan pass. API deploys disabled before configuration/cache proof and frontend; existing-resource authorization is observed; rollback targets are captured, additive schema remains, and SQLite is never reset.                                                                    |

| ID  | Scenario                   | Required result                                                                                                                                                         |
| --- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 | Design references/baseline | 3–5 browsed examples, dated observations, retained Justin identity                                                                                                      |
| A02 | Mobile/desktop             | 360/390/768/1280/1440 screenshots; no overflow, blocked CTA or form controls                                                                                            |
| A03 | Accessible form            | Keyboard steps/errors/back/edit, unknown date flow, consent, server validation                                                                                          |
| A04 | Agent-readable page        | Useful initial HTML, matching structured data, reference page, sitemap; demo noindex                                                                                    |
| A05 | Pricing                    | Exact integer totals, duration/travel rules, unknown route -> no invented charge                                                                                        |
| A06 | Shared KB                  | Same release/hash in voice/chat; source-grounded answers; unknown -> follow-up                                                                                          |
| A07 | Sales behavior             | Both assistants qualify and offer booking without unsupported promises                                                                                                  |
| A08 | Cross-channel intake       | One inquiry, secure association, correction/resume; no private record exposure                                                                                          |
| A09 | Calendar                   | Consultation + tentative show, correct zones, Dave/client invites, no duplicate invites                                                                                 |
| A10 | Conflicts/races            | Two callers contend for same interval: at most one active hold; buffers enforced                                                                                        |
| A11 | Partial failure            | One calendar write/email fails; accurate pending state, reconcile without duplicate                                                                                     |
| A12 | Brief                      | Attractive one-page HTML/PDF delivered to operator, fields and unknowns legible                                                                                         |
| A13 | Operator confirmation      | Approved quote converts existing hold to confirmed; audit and attendee update                                                                                           |
| A14 | Cancel/reschedule/expiry   | Only demo-owned records change; availability released, cancelled show not billed                                                                                        |
| A15 | Morning invoicing          | 08:00 America/Chicago; app-tagged confirmed performances whose end fell on the prior local date; DST, midnight, recurrence and seven-day catch-up                       |
| A16 | Automatic issue            | Eligible completed Calendar performance is assumed played and produces one immutable invoice from the agreed quote without a reply gate                                 |
| A17 | Eligibility skips          | Tentative/cancelled/consultation/all-day/untagged/already-invoiced records produce no invoice                                                                           |
| A18 | Required billing data      | Known confirmed show with missing quote/customer/billing data or mismatched Calendar times/price routes to review; untagged/unparseable/unknown-show events are skipped |
| A19 | Recipient boundary         | Invoice delivery derives exact To/BCC recipients from trusted records/config and rejects any address outside the allowlist                                              |
| A20 | Deduplication              | Duplicate/catch-up/forced jobs or send timeout never creates a duplicate invoice; uncertain sends reconcile                                                             |
| A21 | Delivery                   | Test client receives readable PDF/email; configured operator receives BCC; no public link                                                                               |
| A22 | Auth and abuse             | Public cannot confirm/price/issue/read private data; signed webhooks, rate/recipient limits                                                                             |
| A23 | Provider isolation         | Before/after manifest proves existing Retell/Telnyx/DNS/TrustCore workflows unchanged                                                                                   |
| A24 | Hosting                    | Requested HTTPS hostname, separate project/API, persistent DB, backup/restore evidence                                                                                  |
| A25 | Operations                 | CLI --help/--json, jobs/retries/kill switches, redacted health/errors, resource registry                                                                                |
| A26 | Handoff                    | Reproducible install/build, migrations/export, current runbook, private Git remote verified                                                                             |

## Test layers

Offline unit/domain tests: quotes, transitions, auth gates, dates/timezones/DST, money, Calendar
eligibility, idempotency keys and invoice snapshots. Real local SQL transactions for state/race tests. Provider
contract fixtures for Cal.com, Calendar, Gmail/IMAP and Retell; raw-body signature verification.
Playwright covers user journey plus keyboard/mobile and errors. Visual PDF checks use synthetic data.
Opt-in live smoke suite uses actual isolated integrations and allowlisted test recipients.
Build/lint/typecheck must pass before code commits; docs commits use whitespace/link/secret checks.

## Round-two demo rehearsal (one continuous pass)

1. Open the live homepage at a 390px viewport. Identify Justin and begin the visible planner without
   opening a menu, CTA, modal, assistant, or another route; scroll and show that navigation stays
   pinned without covering content.
2. Submit an allowlisted synthetic inquiry using Text preference and a numeric budget. Resume it and
   verify exact cents, Central Time, `access: "unknown"`, and backward-compatible stored fields.
3. Choose consultation and event dates; inspect both invitation emails and the private one-page
   brief. Confirm that the supplied budget is context and not the quote.
4. Show an upcoming public venue date in Where I'm Playing from the exact Public Shows Calendar,
   then prove private wedding/corporate/consultation/hold fixtures and provider metadata are absent.
5. Operator approves a distinct agreed quote and confirms the show; verify the updated private event.
6. Use an explicit demo time simulation or seeded past confirmed performance and run the real
   morning invoicing logic. Observe one invoice in the test client inbox and operator BCC.
7. Replay the job and verify no second invoice. Show ineligible and missing-metadata skips using
   offline evidence.
8. Audit built public output for zero chat/voice UI, assistant copy, phone number, or `tel:` link,
   while separately proving the protected backend assistant health/tests still pass.

Record UTC timestamp, commit SHA, provider/resource IDs (redacted appropriately), commands,
pass/fail and sanitized artifact links in `docs/evidence/acceptance-results.md`. Mark separately
implemented, offline-tested, live-tested. Failure or missing access is not a pass.
