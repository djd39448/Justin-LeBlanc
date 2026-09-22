# Progress

Updated 2026-09-22. **Round-two implementation and local acceptance are complete on pushed feature
branch `codex/justin-round-two`; they are not yet the deployed public frontend. The deployed
baseline remains substantially live-verified. Full voice booking and recovery after an actual
reboot/sign-out remain unverified.**

## Round-two implementation — locally complete, deployment gated

The verified implementation commit is `ffb2fa00ed1465dbbbbc6ef737033f01751a157c`, based on audited
clean `origin/main` `5d664bb4e51b198ae3dc0768154a1a86a29817a4`. Local evidence is in
[the dated round-two record](docs/evidence/round-two-2026-09-22.md). Do not report these changes as
live until runtime and Pages evidence exists.

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
      access; keep `PUBLIC_EVENTS_ENABLED=false` until that provider gate passes.
- [x] Remove chatbot/voice UI, phone number, `tel:` links, and assistant references from the public
      website while preserving all underlying Retell/OpenAI resources, KB/tools, routes, config, and
      backend tests.
- [x] Add responsive browser evidence at all five required widths, the public-output audit, secret
      scan, and CI gates.
- [ ] Deploy the compatible API disabled-first, verify the exact Calendar endpoint, then deploy the
      dependent frontend. Windows coordination was unavailable; no deployment is claimed. Do not
      mutate Retell for this round.

Final local results: `npm run verify` passed 137 tests in 23 files, lint/typecheck, 21 Astro files
with zero diagnostics, and nine built pages. Playwright passed 30 tests with 15 intentional
viewport-specific skips. The built-output audit scanned 16 files with no findings, and the secret
scan was clean. Baseline was 103 tests in 19 files, 20 Astro files, and nine pages.

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive public site, discovery flow, operator workspace, readable reference content, structured metadata, noindex controls, and deployment `840a4ccf`; `/admin` returned HTTP 200 with the new label, legacy controls, no-store and noindex.
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

[CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) remains the deployed-baseline CI result for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10`: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages. Historical evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md); current local branch evidence is in [the round-two record](docs/evidence/round-two-2026-09-22.md).
