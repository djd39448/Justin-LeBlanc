# Justin LeBlanc — private event booking demo

Website: **https://justinleblancmusic.50by50.dev**. Private repository: [djd39448/Justin-LeBlanc](https://github.com/djd39448/Justin-LeBlanc).

The website and application are implemented. The complete live demonstration is **not complete**: public health, inquiry intake/resume, and chat now pass through the isolated Cloudflare tunnel, while Calendar booking, voice calling, and reply-driven billing remain disabled or pending. The Google grant identity and both limited Calendar scopes are verified, but calendar creation returns HTTP 403 `SERVICE_DISABLED` until the owner enables the Calendar API and accepts any required terms in the Alex project. Retell number provisioning returned `403 No valid KYC`.

The local API and worker run against persistent SQLite. Booking uses a consultation, a buffered tentative hold, an agreed quote, and operator confirmation. Shared-KB chat and voice use the same deterministic tools. Billing reads completed performances by Houston end date, requires an authenticated correlated reply, snapshots the approved invoice, and delivers through a durable outbox. Demo prices are illustrative, and recipients/callers are explicitly allowlisted.

## Verified on 2026-09-21

- `npm run verify`: lint and type checking passed, **72 tests in 16 files**, nine static pages built.
- Exact HTTPS hostname, noindex/security headers, five responsive viewport captures, keyboard navigation, semantic initial HTML.
- Public API health, unauthenticated admin rejection, synthetic inquiry intake/resume, and two grounded OpenAI chat turns passed through `jlm-demo-api.50by50.dev`; no Calendar, email, or voice business write occurred.
- Four real OpenAI qualification cases passed using `gpt-4.1-mini` (6,911 tokens) against the prior KB. The checked-in Central Time policy is KB `2026-09-21.2`; restart chat and republish voice before claiming both live assistants use it.
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
