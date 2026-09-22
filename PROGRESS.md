# Progress

Updated 2026-09-22. **Round-two code is merged to `main` at
`e4e082e5d85d56f3301ce7652180b40c78f24956`; the additive API is live with Public Shows disabled
and the Pages safety bridge is production deployment `5213f7b6`. The visible frontend
intentionally remains the prior design because the Calendar on Justin's existing public events
page mixes private events and street-address locations. A dedicated owner-approved Public Shows
Calendar is still required before the conversion frontend can safely go live. Full voice booking
and recovery after an actual reboot/sign-out remain unverified.**

## Round-two implementation — API live, frontend gated

The verified release commit is `e4e082e5d85d56f3301ce7652180b40c78f24956`, fast-forwarded to
`origin/main` from audited base `5d664bb4e51b198ae3dc0768154a1a86a29817a4`. Release evidence is
in [the dated round-two record](docs/evidence/round-two-2026-09-22.md). Only the additive API and
fail-closed Pages bridge are live; do not report the conversion frontend as deployed.

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
- [ ] Owner-confirm the exact live public-performance-only Calendar and sufficient existing read
      access; the exact Calendar published by the existing events page was inspected and rejected
      because it contains private-event records and street-address locations. Keep
      `PUBLIC_EVENTS_ENABLED=false` until a safe dedicated source passes.
- [x] Remove chatbot/voice UI, phone number, `tel:` links, and assistant references from the public
      website while preserving all underlying Retell/OpenAI resources, KB/tools, routes, config, and
      backend tests.
- [x] Add responsive browser evidence at all five required widths, the public-output audit, secret
      scan, and CI gates.
- [x] Capture private rollback state, deploy the compatible API disabled-first, and verify local,
      direct-tunnel, and exact-site health plus the fixed fail-closed 503. All four existing
      capability flags remain enabled and the outbox has no unresolved effects.
- [ ] Enable and review a dedicated Public Shows source, then deploy the dependent conversion
      frontend. Do not mutate Retell for this round.

Final results: `npm run verify` passed 141 tests in 24 files, lint/typecheck, 21 Astro files
with zero diagnostics, and nine built pages. Playwright passed 30 tests with 15 intentional
viewport-specific skips. The built-output audit scanned 16 files with no findings, and the secret
scan was clean. Both feature and `main` CI passed. Baseline was 103 tests in 19 files, 20 Astro
files, and nine pages.

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive baseline public site, discovery flow, operator workspace, readable reference content, structured metadata, and noindex controls. Production deployment `5213f7b6` reused all 27 static assets and updated only the safety bridge; 26 served files matched the prior visible site, and `/admin` retained no-store/noindex.
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

[Main CI run 35785830763](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35785830763) passed for `e4e082e5d85d56f3301ce7652180b40c78f24956`: **141 tests in 24 files**, lint, typecheck, the public-output and secret audits, 21 Astro files with zero diagnostics, nine built pages, and the Playwright matrix. Historical evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md); current release evidence is in [the round-two record](docs/evidence/round-two-2026-09-22.md).
