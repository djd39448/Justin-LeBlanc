# Progress

Updated 2026-09-22. **The corrected conversion-first frontend is live at
`https://justinleblancmusic.50by50.dev/` from verified frontend revision
`9ca79d9a5afeb38c8740f768b9bae73319f1756e`, contained in both `origin/main` and
`origin/codex/justin-round-two`. Cloudflare Pages deployment
`a3152e61-ed47-41a7-9595-ebd42e694245` serves the release. Corrected deployment
`8d348ce1-d6f7-48f8-ad72-53dd7d856a07` is the immediate rollback target; bridge-only deployment
`5213f7b6-da9c-4985-819b-a05da8831db1` is a legacy fallback. The dedicated Public Shows Calendar
remains disabled for the next QA pass, so Where I'm Playing temporarily renders one verified public
date without requesting Calendar data. Full voice booking and recovery after an actual
reboot/sign-out remain unverified.**

## Round-two implementation — corrected frontend live

The verified frontend release revision is `9ca79d9a5afeb38c8740f768b9bae73319f1756e`, contained in
`origin/main` and the pushed feature branch. Release evidence is in
[the dated round-two record](docs/evidence/round-two-2026-09-22.md). The canonical hostname returns
HTTP 200, health returns HTTP 200, and `/admin` retains no-store/noindex.

- [x] Put the shared planner directly in the opening homepage conversion experience; no CTA, modal,
      or route change is required to begin.
- [x] Pin primary navigation to the viewport top with correct mobile, focus, and anchor-offset
      behavior.
- [x] Implement the brand/hero, category rail, Listen, Follow, FAQ, form-field, and public-copy
      changes in [the round-two specification](docs/ROUND_TWO_BUILD_SPEC.md).
- [x] Add `preferredReply: "text"` and optional integer `budgetCents` while preserving old records;
      replace budget ranges with visitor-entered numeric USD.
- [x] Add the isolated read-only sanitized `/api/public-events` projection and offline fixture proof
      that private/corporate/wedding/consultation/hold sources are never queried or published.
- [ ] During the next QA pass, owner-confirm the exact live public-performance-only Calendar and sufficient existing read
      access; the exact Calendar published by the existing events page was inspected and rejected
      because it contains private-event records and street-address locations. Keep
      `PUBLIC_EVENTS_ENABLED=false` until a safe dedicated source passes.
- [x] Remove chatbot/voice UI, the dormant voice-agent number, package pricing, and assistant
      references from the public website while preserving all underlying Retell/OpenAI resources,
      KB/tools, routes, config, and backend tests. Show the human business phone
      **(832) 303-9116** instead.
- [x] Add one temporary manually curated public listing for **Solo Sunday with Justin LeBlanc**,
      Sep 27, 2026, 5:00–8:00 PM Central, at The Blue Lion Brunchery & Pub in The Woodlands, TX.
      Link to the public Woodlands Online source, omit the street address, filter it at build time,
      expire it client-side after the event, and make no frontend Calendar request.
- [x] Add responsive browser evidence at all five required widths, the public-output audit, secret
      scan, and CI gates.
- [x] Capture private rollback state, deploy the compatible API disabled-first, and verify local,
      direct-tunnel, and exact-site health plus the fixed fail-closed 503. All four existing
      capability flags remain enabled and the outbox has no unresolved effects.
- [x] Deploy and smoke-test the corrected conversion frontend without enabling or querying the
      Public Shows Calendar. Do not mutate Retell for this release.
- [ ] Configure and review a dedicated Public Shows Calendar during the next QA pass; keep the
      exact safe `/api/public-events` 503 until then.

Final results: local verification passed 146 unit/integration tests in 24 files, lint/typecheck, 21 Astro files with
zero diagnostics, and nine built pages. Playwright passed 32 tests with 23 intentional
viewport-specific skips across five viewports. The built-output audit had zero findings, and the
secret scan was clean. Feature CI run
[35805519891](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805519891) and main CI run
[35805755436](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805755436) passed.

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive public site, discovery flow, operator workspace, readable reference content, structured metadata, and noindex controls. Production deployment `a3152e61` serves the corrected conversion frontend, the canonical hostname returns HTTP 200, and `/admin` retains no-store/noindex. Corrected deployment `8d348ce1` is the immediate rollback target; prior bridge-only deployment `5213f7b6` is a legacy fallback.
- [x] Billing-policy KB parity: Retell v4, API and chat use `2026-09-21.4` / `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`; all three health paths returned HTTP 200 with all capabilities enabled after restart.
- [x] Deterministic booking, money, state transitions, authentication, recipient gates, outbox leases, uncertainty reconciliation, and operator CLI.
- [x] Public/assistant booking authorization before availability or hold creation, including replay-token validation, plus an independent attendee allowlist at the final Calendar provider boundary.
- [x] Live negative recipient/token checks rejected unsafe booking requests without creating a hold or effect.
- [x] Live Calendar consultation and tentative hold with Central times, invited roles, private brief, same-ID confirmation, non-overlapping reschedule, and cancellation.
- [x] Historical old-policy acceptance: authenticated YES reply, one immutable USD 700.00 invoice, exact client Message-ID receipt, operator BCC receipt, Sent reconciliation, and zero-duplicate replay.
- [ ] Current automatic invoice policy is implemented, CI-verified and loaded in the running services. Fresh Calendar-to-inbox evidence remains pending; the attempted seed was blocked before mutation and made no new show, invoice or email.
- [x] Isolated Houston voice resource at **(832) 501-3799**, published agent/LLM v3 on the same protected identities, four admitted connections, correct versioned KB identity, and actual phone-tool evidence for inquiry creation, availability, and human follow-up.
- [x] Existing Retell, DNS, Pages, and other provider resources reconciled unchanged; only isolated demo resources were added.
- [x] Current backup restored read-only with two shows and one invoice and passed SQLite integrity checking.
- [x] Local API, worker, and tunnel are running with booking, chat, voice, morning, and invoice gates enabled.
- [ ] Full voice workflow: the first three calls remain historical evidence, including the third call's HTTP 413 failures. The 210,264 ms fourth v2 call (`ee1ddd70e7624259`, 36.473 cents, `user_hangup`) proved the repaired path: `upsert_inquiry`, four `get_availability` results, `request_human_followup`, and started/ended/analyzed events all persisted. Each availability result allowed the performance and was blocked only by the then-active 24-hour consultation rule. Booking did not complete, and v3 native `end_call` has not been phone-tested.
- [x] Startup registration and task execution: backup created at 15:38:36 UTC, tasks restarted at 15:38:40 UTC, and all three verified running S4U/Limited with exact boot triggers at 15:39:09 UTC. All three health paths and worker startup jobs passed afterward.
- [ ] Recovery after an actual reboot or sign-out has not been authorized or tested.

The provider queue was empty after the live booking cancellation and invoice replay. A confirmed event's attendee copy can still cause a safe false rejection when a requested reschedule overlaps the current interval; free/busy lacks event identity, so the adapter deliberately does not subtract that interval.

[Main CI run 35805755436](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805755436) passed for `9ca79d9a5afeb38c8740f768b9bae73319f1756e`, after feature CI run [35805519891](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35805519891) also passed: **146 tests in 24 files**, lint, typecheck, the public-output and secret audits, 21 Astro files with zero diagnostics, nine built pages, and the Playwright matrix. Historical evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md); current release evidence is in [the round-two record](docs/evidence/round-two-2026-09-22.md).
