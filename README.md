# Justin LeBlanc — private event booking demo

Website: **https://justinleblancmusic.50by50.dev**. Private repository: [djd39448/Justin-LeBlanc](https://github.com/djd39448/Justin-LeBlanc).

The website and application are implemented. Public health, inquiry intake/resume, chat, the dedicated Google Calendar booking lifecycle, and reply-driven invoice delivery have passed through the isolated demo stack. The isolated voice agent and LLM are published at version 1 with the Central Time KB, and a separate Houston 832 demo number is configured. A live call reached three verified signed webhooks but invoked no assistant tools; a revised search-first prompt and one short tool-bearing call remain pending. Unattended Windows startup also remains incomplete.

The local API and worker run against persistent SQLite. Booking uses a consultation, a buffered tentative hold, an agreed quote, and operator confirmation. Shared-KB chat and voice use the same deterministic tools. Billing reads completed performances by Houston end date, requires an authenticated correlated reply, snapshots the approved invoice, and delivers through a durable outbox. Demo prices are illustrative, and recipients/callers are explicitly allowlisted.

## Verified on 2026-09-21

- `npm run verify`: lint and type checking passed, **81 tests in 17 files** passed, Astro checked 19 files with zero diagnostics, and nine static pages built at 15:03:11 UTC.
- Exact HTTPS hostname on deployment `e63652d3`, noindex/security headers, responsive desktop/mobile layout, keyboard navigation, semantic initial HTML, Central-time planner labels, and the gated Houston voice CTA.
- Local, direct-tunnel, and website-proxy health report booking, chat, voice, and billing capabilities on. The API, worker, and tunnel tasks are running.
- Four real OpenAI qualification cases passed using `gpt-4.1-mini` (6,911 tokens). Chat and the published voice configuration use Central Time KB `2026-09-21.2`, SHA-256 `d6dd327317ecf32b537cbc74df5ea7957e79429442383014d4ef40986d9b0ad6`.
- A live synthetic Calendar flow passed consultation and tentative-hold creation, invitation and private brief delivery, operator confirmation, reschedule, and cancellation. Tentative holds stay transparent until confirmation so an attendee copy does not collide with the same canonical hold.
- The actual reply-driven billing flow accepted an authenticated `YES`, issued one immutable $700 demo invoice, reconciled its Sent copy, and verified exactly one matching client Inbox receipt plus Dave's BCC receipt.
- The Houston demo number and published voice configuration are provider-reconciled. One live call reached three signed webhooks without invoking backend tools; do not describe the voice booking tools as live-tested until the revised prompt and short acceptance call pass.
- Visually inspected synthetic PDF brief and invoices; authenticated local brief PDF served successfully.
- Service restart and seeded SQLite backup/restore passed. The owned tasks remain InteractiveOnly; an elevated operator must apply and verify the reversible startup upgrade for unattended operation.

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
