# Justin LeBlanc — private event booking demo

Website: **https://justinleblancmusic.50by50.dev**. Private repository: [djd39448/Justin-LeBlanc](https://github.com/djd39448/Justin-LeBlanc).

The website and application are implemented. Public health, inquiry intake/resume, chat, the dedicated Google Calendar booking lifecycle, and reply-driven invoice delivery have passed through the isolated demo stack. The isolated voice agent and LLM are published at version 3, and the Houston demo number is **(832) 501-3799**. A fourth actual call proved inquiry creation, four availability tool results, human-follow-up persistence, and all three lifecycle webhooks after the body/time repair. Full voice booking, native hangup, and recovery after an actual reboot or sign-out remain unverified. See [call-completion evidence](docs/evidence/consultation-call-completion.json).

The local API and worker run against persistent SQLite. Booking uses a consultation, a buffered tentative hold, an agreed quote, and operator confirmation. Shared-KB chat and voice use the same deterministic tools. Billing reads completed performances by Houston end date, requires an authenticated correlated reply, snapshots the approved invoice, and delivers through a durable outbox. Demo prices are illustrative, and recipients/callers are explicitly allowlisted.

## Verified on 2026-09-21

- [Consultation-policy CI](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35624105352) passed for `e8b66cda1bfc473320c44dbc53bb28509c993800` at 16:13:44 UTC: **98 tests in 19 files**, ESLint, TypeScript, 20 Astro files with zero errors/warnings, and nine built pages.
- Current deployment `75996868` adds the two supplied photographs; its desktop/mobile photo QA and build passed. Earlier noindex/security, keyboard, Central-time and Houston voice-CTA checks remain recorded separately. See [photo evidence](docs/evidence/user-photos.json).
- Local, direct-tunnel, and website-proxy health report booking, chat, voice, and billing capabilities on. The API, worker, and tunnel tasks are running.
- Four real OpenAI qualification cases passed using `gpt-4.1-mini` (6,911 tokens). The published voice configuration uses Central Time KB `2026-09-21.3`, SHA-256 `2e53a286acbc5d1793d01a9c25c9429d033e0521cd8f9279fe3d63c5c675eb1e`, with six unchanged backend tools plus native `end_call`. The API and chat still report `2026-09-21.2` until Dave completes the required Administrator restart.
- A live synthetic Calendar flow passed consultation and tentative-hold creation, invitation and private brief delivery, operator confirmation, reschedule, and cancellation. Tentative holds stay transparent until confirmation so an attendee copy does not collide with the same canonical hold.
- The actual reply-driven billing flow accepted an authenticated `YES`, issued one immutable $700 demo invoice, reconciled its Sent copy, and verified exactly one matching client Inbox receipt plus Dave's BCC receipt.
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

- [Current progress](PROGRESS.md), [handoff](docs/HANDOFF.md), [operations runbook](docs/RUNBOOK.md).
- [Resource inventory and deployment/restart commands](docs/resource-inventory.md).
- [Build specification](docs/BUILD_SPEC.md), [decisions](docs/DECISIONS.md), [workflows](docs/WORKFLOWS.md), [architecture](docs/ARCHITECTURE.md).
- [Design research](docs/design-research.md), [campaign drafts](docs/campaign-drafts.md), [document QA](docs/evidence/documents/README.md).
- [Acceptance requirements](docs/ACCEPTANCE.md), [coding standards](CODING_STANDARDS.md), [agent instructions](AGENTS.md).

No credentials, raw call transcripts, real customer data, or private invoices belong in Git. The checked-in documents and screenshots use synthetic data. Keep the demo noindex and keep all effects within the configured demo allowlists.
