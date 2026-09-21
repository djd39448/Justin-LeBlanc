# Progress

Updated 2026-09-21. **Implemented and partially live-verified; the requested end-to-end demo remains incomplete.**

- [x] Private repository, approved specification, isolation preflight, runtime architecture.
- [x] Researched redesign, authentic blue/guitar identity, discovery form, shared assistant UI, operator workspace, campaign drafts, readable reference and structured metadata.
- [x] Persistent canonical records, strict schemas, deterministic pricing/state, auth and allowlists, durable outbox, leases, reconciliation, CLI, backups and exports.
- [x] Calendar booking/confirmation/cancel/reschedule/expiry adapters; OpenAI and signed Retell tool adapters sharing one versioned KB.
- [x] Houston morning job, authenticated IMAP reply handling, revised-total approval, immutable invoices, private HTML/PDF documents, guarded SMTP delivery.
- [x] 69 offline tests, lint/type checking, nine-page build, mobile/keyboard inspection, document visual QA.
- [x] Separate Cloudflare Pages site deployed at the exact hostname. The isolated named tunnel is running, and local API and worker tasks remain InteractiveOnly.
- [x] Real chat qualification (four cases/6,911 tokens), synthetic SMTP/IMAP diagnostic and Sent reconciliation, seeded database restore, provider isolation comparison.
- [x] Public API: health, unauthorized admin rejection, synthetic inquiry intake/resume, and two grounded chat turns passed through the isolated public tunnel with no provider business writes.
- [ ] Calendar: refresh-token identity and both limited scopes are verified; calendar creation returns HTTP 403 `SERVICE_DISABLED` until the owner enables the Calendar API/terms in the Alex project, then provision-only recovery and invitation acceptance remain.
- [ ] Live booking, operator brief receipt, confirmation update, actual performer reply, invoice receipt/BCC and replay demonstration.
- [ ] Retell number: owner KYC required after a single API attempt returned 403; live call pending.
- [ ] Unattended uptime: S4U startup registration denied; current tasks require the Windows user to remain signed in.

Full-suite application baseline: `8b8a4c9`. Public API smoke evidence: `6331d2b`. Deployed Pages version: `ae47bbfd`. Final documentation commits are discoverable with `git log`; [acceptance evidence](docs/evidence/acceptance-results.md) records the exact verification scope.

Workers completed bounded design/web, booking/AI, and billing/document tasks with explicit ownership. Windows and Mac shared the same ChatGPT Pro allowance; the final measured window was **17% used**, so the required 25% reserve remained intact. No reset credits were consumed. Account usage is shared and is not a per-task token attribution. The measured API qualification tokens are separate from that cloud allowance.

The before/after manifest shows no existing Retell agent/number, Pages project, or DNS record changed. Only Justin-scoped resources were created. See the [resource inventory](docs/resource-inventory.md), [runbook](docs/RUNBOOK.md), and [handoff](docs/HANDOFF.md) for the precise restartable dependencies.
