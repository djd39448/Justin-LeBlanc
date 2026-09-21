# Justin LeBlanc — private event booking demo

Website: **https://justinleblancmusic.50by50.dev**. Private repository: [djd39448/Justin-LeBlanc](https://github.com/djd39448/Justin-LeBlanc).

The website and application are implemented. The complete live demonstration is **not complete**: the public API tunnel and Google Calendar consent await owner approval, and Retell number provisioning returned `403 No valid KYC`. Until those dependencies are resolved, the public site loads but form submission, chat, scheduling, and the operator workspace cannot reach the backend.

The local API and worker run against persistent SQLite. Booking uses a consultation, a buffered tentative hold, an agreed quote, and operator confirmation. Shared-KB chat and voice use the same deterministic tools. Billing reads completed performances by Houston end date, requires an authenticated correlated reply, snapshots the approved invoice, and delivers through a durable outbox. Demo prices are illustrative, and recipients/callers are explicitly allowlisted.

## Verified on 2026-09-21

- `npm run verify`: lint and type checking passed, **69 tests in 15 files**, nine static pages built.
- Exact HTTPS hostname, noindex/security headers, five responsive viewport captures, keyboard navigation, semantic initial HTML.
- Four real OpenAI qualification cases passed using `gpt-4.1-mini` (6,911 tokens); both assistant configurations share KB `2026-09-21.1`.
- One real synthetic SMTP diagnostic, bounded IMAP read, and Sent-copy reconciliation. This is **not** proof of actual reply-driven invoicing.
- Visually inspected synthetic PDF brief and invoices; authenticated local brief PDF served successfully.
- Service restart and seeded SQLite backup/restore passed. Existing audited Retell, Pages, and DNS resources remained unchanged.

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
