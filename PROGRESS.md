# Progress

Updated 2026-09-22. **The deployed baseline is substantially live-verified; the approved round-two
brand/conversion work below is not implemented. Full voice booking and recovery after an actual
reboot/sign-out remain unverified.**

## Round-two approved work — pending

Requirements were updated on 2026-09-22; none of the items below should be reported as deployed
until new evidence exists.

- [ ] Put the shared planner directly in the opening homepage conversion experience; no CTA, modal,
      or route change is required to begin.
- [ ] Pin primary navigation to the viewport top with correct mobile, focus, and anchor-offset
      behavior.
- [ ] Implement the brand/hero, category rail, Listen, Follow, FAQ, form-field, and public-copy
      changes in [the round-two specification](docs/ROUND_TWO_BUILD_SPEC.md).
- [ ] Add `preferredReply: "text"` and optional integer `budgetCents` while preserving old records;
      replace budget ranges with visitor-entered numeric USD.
- [ ] Resolve the exact live Public Shows Calendar, add the isolated read-only sanitized
      `/api/public-events` projection, and prove private/corporate/wedding/consultation/hold events never
      enter public output.
- [ ] Remove chatbot/voice UI, phone number, `tel:` links, and assistant references from the public
      website while preserving all underlying Retell/OpenAI resources, KB/tools, routes, config, and
      backend tests.
- [ ] Add responsive/browser/privacy evidence and deploy the compatible API before the dependent
      frontend. Do not mutate Retell for this round.

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

[CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) passed for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10` at 17:44:56 UTC: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages. Current evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md).
