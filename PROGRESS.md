# Progress

Updated 2026-09-21. **Implemented and substantially live-verified. Full voice booking and recovery after an actual reboot/sign-out remain unverified.**

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive public site, discovery flow, operator workspace, readable reference content, structured metadata, noindex controls, and exact-host deployment.
- [x] Shared KB parity after the consultation-policy release: Retell v3, API, and chat use `2026-09-21.3` / `2e53a286acbc5d1793d01a9c25c9429d033e0521cd8f9279fe3d63c5c675eb1e`; all health paths passed, and a read-only website request accepted an available consultation only 68 minutes ahead with no reasons.
- [x] Deterministic booking, money, state transitions, authentication, recipient gates, outbox leases, uncertainty reconciliation, and operator CLI.
- [x] Public/assistant booking authorization before availability or hold creation, including replay-token validation, plus an independent attendee allowlist at the final Calendar provider boundary.
- [x] Live negative recipient/token checks rejected unsafe booking requests without creating a hold or effect.
- [x] Live Calendar consultation and tentative hold with Central times, invited roles, private brief, same-ID confirmation, non-overlapping reschedule, and cancellation.
- [x] Live Houston morning run, authenticated YES reply, one immutable USD 700.00 invoice, exact client Message-ID receipt, operator BCC receipt, Sent reconciliation, and zero-duplicate replay.
- [x] Isolated Houston voice resource at **(832) 501-3799**, published agent/LLM v3 on the same protected identities, four admitted connections, correct versioned KB identity, and actual phone-tool evidence for inquiry creation, availability, and human follow-up.
- [x] Existing Retell, DNS, Pages, and other provider resources reconciled unchanged; only isolated demo resources were added.
- [x] Current backup restored read-only with two shows and one invoice and passed SQLite integrity checking.
- [x] Local API, worker, and tunnel are running with booking, chat, voice, morning, and invoice gates enabled.
- [ ] Full voice workflow: the first three calls remain historical evidence, including the third call's HTTP 413 failures. The 210,264 ms fourth v2 call (`ee1ddd70e7624259`, 36.473 cents, `user_hangup`) proved the repaired path: `upsert_inquiry`, four `get_availability` results, `request_human_followup`, and started/ended/analyzed events all persisted. Each availability result allowed the performance and was blocked only by the then-active 24-hour consultation rule. Booking did not complete, and v3 native `end_call` has not been phone-tested.
- [x] Startup registration and task execution: backup created at 15:38:36 UTC, tasks restarted at 15:38:40 UTC, and all three verified running S4U/Limited with exact boot triggers at 15:39:09 UTC. All three health paths and worker startup jobs passed afterward.
- [ ] Recovery after an actual reboot or sign-out has not been authorized or tested.

The provider queue was empty after the live booking cancellation and invoice replay. A confirmed event's attendee copy can still cause a safe false rejection when a requested reschedule overlaps the current interval; free/busy lacks event identity, so the adapter deliberately does not subtract that interval.

[Consultation-policy CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35624105352) passed for `e8b66cda1bfc473320c44dbc53bb28509c993800` at 16:13:44 UTC: **98 tests in 19 files**, ESLint, TypeScript, 20 Astro files with zero errors/warnings, and nine built pages. Current evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md), with operational recovery in the [runbook](docs/RUNBOOK.md) and current limitations in the [handoff](docs/HANDOFF.md).
