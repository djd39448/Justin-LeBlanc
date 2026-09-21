# Progress

Updated 2026-09-21. **Implemented and substantially live-verified. Full voice booking and recovery after an actual reboot/sign-out remain unverified.**

- [x] Isolated repository, approved specification, provider isolation preflight, runtime architecture, durable SQLite state, backups, exports, and restore integrity.
- [x] Responsive public site, discovery flow, operator workspace, readable reference content, structured metadata, noindex controls, and exact-host deployment.
- [x] Shared KB-backed chat and voice prompts using release `2026-09-21.2` and hash `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6`.
- [x] Deterministic booking, money, state transitions, authentication, recipient gates, outbox leases, uncertainty reconciliation, and operator CLI.
- [x] Public/assistant booking authorization before availability or hold creation, including replay-token validation, plus an independent attendee allowlist at the final Calendar provider boundary.
- [x] Live negative recipient/token checks rejected unsafe booking requests without creating a hold or effect.
- [x] Live Calendar consultation and tentative hold with Central times, invited roles, private brief, same-ID confirmation, non-overlapping reschedule, and cancellation.
- [x] Live Houston morning run, authenticated YES reply, one immutable USD 700.00 invoice, exact client Message-ID receipt, operator BCC receipt, Sent reconciliation, and zero-duplicate replay.
- [x] Isolated Houston voice resource at **(832) 501-3799**, published agent/LLM v2, three admitted connections, correct KB identity, honest unknown-song handling, a correct `America/Chicago` answer, and one persisted inquiry created through `upsert_inquiry`.
- [x] Existing Retell, DNS, Pages, and other provider resources reconciled unchanged; only isolated demo resources were added.
- [x] Current backup restored read-only with two shows and one invoice and passed SQLite integrity checking.
- [x] Local API, worker, and tunnel are running with booking, chat, voice, morning, and invoice gates enabled.
- [ ] Full voice workflow: the first two calls invoked no tools. On the 196,946 ms third v2 call, inquiry creation and association passed, but two availability calls and one human-follow-up call failed HTTP 413 `body_too_large`. Backend body-limit and naive Central-time normalization repairs passed focused tests, were reloaded by an Administrator restart, and passed live signed HTTP diagnostics; post-fix phone availability, follow-up, and booking remain pending.
- [x] Startup registration and task execution: backup created at 15:38:36 UTC, tasks restarted at 15:38:40 UTC, and all three verified running S4U/Limited with exact boot triggers at 15:39:09 UTC. All three health paths and worker startup jobs passed afterward.
- [ ] Recovery after an actual reboot or sign-out has not been authorized or tested.

The provider queue was empty after the live booking cancellation and invoice replay. A confirmed event's attendee copy can still cause a safe false rejection when a requested reschedule overlaps the current interval; free/busy lacks event identity, so the adapter deliberately does not subtract that interval.

[Voice repair CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35622823710) passed for `ac22144` at 16:02:21 UTC: **94 tests in 19 files**, ESLint, TypeScript, 20 Astro files with zero errors/warnings, and nine built pages. Seven new tests cover the Retell body boundary and DST-aware assistant time conversion. Current evidence is indexed in [acceptance results](docs/evidence/acceptance-results.md), with operational recovery in the [runbook](docs/RUNBOOK.md) and current limitations in the [handoff](docs/HANDOFF.md).
