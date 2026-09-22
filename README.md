# Justin LeBlanc — private event booking demo

Website: **https://justinleblancmusic.50by50.dev**. Private repository: [djd39448/Justin-LeBlanc](https://github.com/djd39448/Justin-LeBlanc).

The existing website and application are deployed. Public health, inquiry intake/resume, chat, and the dedicated private Google Calendar booking lifecycle have passed through the isolated demo stack. Automatic 08:00 America/Chicago invoicing from eligible completed Calendar performances is implemented, tested and loaded in the running services; a fresh live end-to-end invoice delivery remains pending. The earlier reply-driven $700 invoice remains historical old-policy evidence. Retell v4, API and chat share billing-policy KB `2026-09-21.4`. Full voice booking, native hangup, and recovery after an actual reboot or sign-out remain unverified.

The local API and worker run against persistent SQLite. Booking uses a consultation, a buffered tentative hold, an agreed quote, and operator confirmation. Shared-KB chat and voice use the same deterministic tools. Current billing policy treats an app-tagged confirmed Calendar performance that ended on the prior Houston date as played, then snapshots the agreed quote and complete billing record and delivers through a durable outbox to exact allowlisted To/BCC recipients. Demo prices are illustrative, and recipients/callers are explicitly allowlisted.

## Round two — implemented locally, release gated

The conversion-first refresh is implemented and locally verified in commit
`ffb2fa00ed1465dbbbbc6ef737033f01751a157c` on `codex/justin-round-two`. The homepage opens with
the usable planner, keeps navigation pinned, accepts an optional exact numeric USD budget, removes
public chat/voice/phone presentation while preserving the backend, and renders a fail-closed
sanitized feed from one exact server-configured Public Shows Calendar.

The branch is pushed but is not merged, and this paragraph is not a claim that the public Pages
frontend has changed. The frontend release remains closed until the additive API is installed
disabled-first on the authoritative Windows runtime and the owner confirms an exact
public-performance-only Calendar with sufficient existing read access. See
[the dated round-two evidence](docs/evidence/round-two-2026-09-22.md),
[the build specification](docs/ROUND_TWO_BUILD_SPEC.md), and [the kickoff](KICKOFF.md).

Final local verification passed with **137 tests in 23 files**, lint/typecheck clean, 21 Astro files
with zero diagnostics, nine built pages, 30 Playwright passes (15 intentional viewport skips), a
clean 16-file public-output audit, and a clean secret scan. The clean pre-edit baseline was 103 tests
in 19 files, 20 Astro files, and nine pages.

## Verified on 2026-09-21

- [CI run 35633834649](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35633834649) passed for `58d1c0ce5cd7fc8b675b0a89443bfa82bcfd9b10` at 17:44:56 UTC: **103 tests in 19 files**, lint, typecheck, 20 Astro files with zero errors/warnings, and nine built pages.
- Current site deployment `840a4ccf` serves the updated admin label and legacy controls at `/admin` with HTTP 200, no-store and noindex verified. Photo deployment `75996868` remains historical visual evidence. See [photo evidence](docs/evidence/user-photos.json).
- Local, direct-tunnel, and website-proxy health report booking, chat, voice, and billing capabilities on. The API, worker, and tunnel tasks are running.
- Retell agent/LLM v4 is published and read-back verified on the same protected identities with KB `2026-09-21.4`, SHA-256 `63f6cc2c6ac6d9066a490513f50e9c3f48de9c4d6acbc2f17cde92e4880b9c96`, six unchanged custom tools and native `end_call`. At about 17:45 UTC all three health paths returned HTTP 200 with that KB, all capabilities enabled and the Houston number; all tasks were Running/S4U.
- A live synthetic Calendar flow passed consultation and tentative-hold creation, invitation and private brief delivery, operator confirmation, reschedule, and cancellation. Tentative holds stay transparent until confirmation so an attendee copy does not collide with the same canonical hold.
- Historical old-policy evidence: an authenticated `YES` issued one immutable $700 demo invoice, reconciled its Sent copy, and verified the client and operator copies. This does not prove the new Calendar-driven automatic invoice flow.
- The attempted live current-policy seed was blocked before mutation, leaving no new show, invoice or email. A successful live automatic-invoice walkthrough remains pending.
- The first two calls remain historical no-tool connections: 59,473 ms (11.86 cents) on v1 and 18,473 ms (5.177 cents) on v2. The third v2 call lasted 196,946 ms and cost 34.191 cents; inquiry creation passed, while availability and follow-up returned `body_too_large`. The fourth v2 call (`ee1ddd70e7624259`) lasted 210,264 ms, cost 36.473 cents, and ended by `user_hangup`. The backend ledger recorded `upsert_inquiry`, four `get_availability` results with `performanceAvailable=true` and only the then-active 24-hour consultation rule blocking the requested slots, persisted `request_human_followup`, and started/ended/analyzed events. Booking did not complete, and native hangup has not been phone-tested.
- Visually inspected synthetic PDF brief and invoices; authenticated local brief PDF served successfully.
- Service restart and seeded SQLite backup/restore passed. The corrected upgrade created its backup at 15:38:36 UTC and restarted the tasks at 15:38:40 UTC. At 15:39:09 UTC all three were running as S4U/Limited with exactly one boot trigger; all three health paths passed at 15:39:43 UTC. Actual reboot/sign-out recovery has not been tested.

See the [A01–A26 evidence matrix](docs/evidence/acceptance-results.md) for offline, provider, and pending live results.

## Run locally

Use Node **24.14.0** (supported major 24) and the checked-in lockfile. Copy `.env.example` to a protected location outside this repository; configure only authorized demo accounts.

```powershell
npm ci
npx playwright install chromium
npm run verify
npm run test:e2e
npm run audit:public
npm run scan:secrets -- --json
node --env-file=C:/private/jlm-demo/runtime.env --import tsx apps/api/server.ts
# In a second terminal:
node --env-file=C:/private/jlm-demo/runtime.env --import tsx scripts/worker.ts
```

The server binds to `127.0.0.1:4318`. Provider writes default off. Database schema initialization is automatic; see [migration notes](db/migrations/README.md). The operator CLI shares the same validated actions as HTTP:

```powershell
node --env-file=C:/private/jlm-demo/runtime.env --import tsx scripts/cli.ts --help
node --env-file=C:/private/jlm-demo/runtime.env --import tsx scripts/cli.ts --json health
```

## Documentation

- [Current progress](PROGRESS.md), [handoff](docs/HANDOFF.md), [operations runbook](docs/RUNBOOK.md), [round-two evidence](docs/evidence/round-two-2026-09-22.md).
- [Resource inventory and deployment/restart commands](docs/resource-inventory.md).
- [Round-two build specification](docs/ROUND_TWO_BUILD_SPEC.md), [baseline build specification](docs/BUILD_SPEC.md), [decisions](docs/DECISIONS.md), [workflows](docs/WORKFLOWS.md), [architecture](docs/ARCHITECTURE.md).
- [Design research](docs/design-research.md), [campaign drafts](docs/campaign-drafts.md), [document QA](docs/evidence/documents/README.md).
- [Acceptance requirements](docs/ACCEPTANCE.md), [coding standards](CODING_STANDARDS.md), [agent instructions](AGENTS.md).

No credentials, raw call transcripts, real customer data, or private invoices belong in Git. The checked-in documents and screenshots use synthetic data. Keep the demo noindex and keep all effects within the configured demo allowlists.
