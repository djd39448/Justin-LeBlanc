# Kickoff — complete Justin LeBlanc demo

Select **GPT-6 Astra**, **Ultra** reasoning, coding mode in a new session. This prompt cannot
change host settings. Use Ultracode/Compound Engineering tools if installed; otherwise their
explicit plan/work/review/compound equivalents. Paste everything below the divider.

---

Build and verify the complete Justin LeBlanc private-event website and automation demo from the
approved docs in https://github.com/djd39448/Justin-LeBlanc (private). Use this repo as the sole
deliverable. Push small verified commits as you go. Do not stop at a plan, scaffold, mock-only demo
or frontend; carry through deployment, real integration tests, review, evidence and handoff.

Read AGENTS.md, README.md, CODING_STANDARDS.md, docs/BUILD_SPEC.md, docs/DECISIONS.md,
docs/WORKFLOWS.md, docs/ARCHITECTURE.md, docs/INTEGRATIONS.md, docs/DOCUMENT_DESIGN.md,
docs/ACCEPTANCE.md and plans/2026-09-21-build-plan.md. These are the approved scope. Choose
reasonable documented demo defaults without asking Dave to repeat decisions. Preserve the current
blue/guitar identity while fully implementing the private-booking redesign and workflows.

Act as Astra Ultra conductor. Check usage before substantial dispatch/after batches; reserve 25%
of the tightest shared allowance. Scripts handle deterministic work, qualified local models handle
suitable extraction/drafting, cheapest capable available workers handle bounded implementation.
Reserve Astra for architecture, difficult logic, integration and review. Delegate independent
web/design, booking/AI and invoice/document tasks with exact file ownership, acceptance IDs,
compact briefs and concise output limits. Confirm model/host availability, reconcile started jobs
before retry and never consume reset credits automatically. Follow Switchboard playbook if used.

Design worker MUST browse Justin's website/socials and at least 3–5 similar private-event musician
sites; start from docs/RESEARCH.md and write dated design decisions and asset/fact provenance.
Preserve his identity, use authentic media, prioritize mobile and semantic initial HTML. Implement
accurate structured metadata and a human-readable agent reference. Demo stays noindex with
indexing-ready architecture. Public shows are secondary: hear him before booking; free admission
claims require actual venue evidence.

Host at exactly https://justinleblancmusic.50by50.dev with a separate Cloudflare Pages project.
Inspect existing 50by50/TrustCore sources/config read-only; reuse proven patterns without editing
production sites, root/MX DNS, existing agents/numbers/global hooks, lead watcher or family-calendar
protections. Provision only Justin-scoped resources. Source paths and live-readiness gaps are in
docs/INTEGRATIONS.md. Old README status is not proof of current live behavior.

Implement discovery form; one versioned KB for Retell voice and OpenAI chat; warm grounded sales
answers and shared tools; new Retell-managed number and separate agent in existing account, no
Telnyx work. Reuse the existing authorized OpenAI API key server-side (reuse already decided),
never print it. Qualify an economical chat model. Deterministic code governs state, money and
permissions. Deploy both assistants on the same KB version.

Complete booking: consultation plus tentative performance hold, correct zones/buffers/conflicts,
client and Dave invitations, beautiful private one-page HTML/PDF brief, operator confirmation
after consultation/agreed price, working cancellation/reschedule/expiry. Build operator UI and
documented equivalent CLI. Expose partial failures and reconcile without duplicate external effects.

Complete invoicing: daily 08:00 Houston job reads confirmed shows that ENDED yesterday, emails
performer asking if played and changes, ingests actual replies via separate IMAP/Gmail worker.
Authorized YES issues invoice from customer DB and agreed calendar/DB quote. NO means no invoice.
Changes require explicit revised-total approval; ambiguity waits. Professional HTML/PDF goes To
test client and BCC performer (Dave for demo). Durable cursors/locks, immutable snapshots,
deduplication and uncertain-send reconciliation are required. SMTP-only or mock replies don't count.

Use labeled demo prices and synthetic customers, exact recipient allowlists, no real payment
request. Add admin-only simulation/run-now to demonstrate morning job immediately. Limit live
effects to designated demo users. Include campaign-ready messaging and tracking, but no ad buys,
published marketing campaigns or real-client invoices.

Follow coding standards: strict types/schemas, annotated modules, clean boundaries, actionable
errors, no secrets/PII in Git, maintainable CLI, rollbackable commits. Run relevant lint/typecheck/
tests before commits and push passing milestones. Prove business/security logic offline, then
live allowlisted provider smoke tests. Verify mobile/keyboard, initial HTML, PDFs, invitations,
brief receipt, actual reply-driven invoice/BCC and replay protection. Compare existing resource
manifest before/after to show isolation.

Proceed autonomously on routine choices. If required access, privilege or a charge needs Dave's
action under host rules, ask one precise question while finishing all independent work. Don't
weaken protections, claim nonexistent tools or fabricate success. Record exact dependency and
restartable commands for genuinely blocked live steps. Do not call partial work complete.

Resolve material review findings, write docs/solutions learnings, complete acceptance evidence,
update RUNBOOK/PROGRESS/HANDOFF and resource inventory, and sync Git. Return live URL, short demo
walkthrough, commit SHA, measured verification and actual limitations. Start now and persist
through the complete approved scope.
