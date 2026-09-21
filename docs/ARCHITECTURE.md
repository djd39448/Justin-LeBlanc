# Architecture and data contracts

## Selected direction

Standalone portable TypeScript repository; Astro static-first website with small interactive
islands, Tailwind using Justin-specific tokens; Node Hono API/adapters (matching existing voice
service patterns), shared Zod schemas, SQL migrations, Vitest and Playwright. Pin supported
versions after checking the current runtime, not by copying old lockfiles. Do not depend on
private absolute paths or the Birthday-Challenge monorepo to build Justin's deliverable.

Cloudflare Pages hosts the frontend in project `50by50-justinleblancmusic`. Use a separate
Node-capable service for integrations/PDF/email on an already available host. Prefer an existing
managed Postgres service with a dedicated database or schema and restricted credentials. If no
such service exists, a dedicated SQLite database on a verified persistent single-instance Node
host is acceptable for demo with backups and transactional locking. Never put SQLite on an
ephemeral serverless filesystem. Record actual host/store decision before implementing adapters;
no unapproved new paid account. Missing hosting/access is a named preflight dependency, not a
reason to silently replace persistence with process memory.

Frontend -> validated API -> domain services -> database + transactional outbox -> isolated
Calendar/Cal.com, Gmail and Retell adapters. Chat and voice tools enter the same domain services.
Scheduler invokes authenticated job endpoints or CLI. Private storage holds generated PDFs.
Browser sees only publishable widget configuration, never provider credentials or admin tokens.

## Module map (target, create during build)

`apps/web/`: pages, components, styles and accessible form/chat UI.
`apps/api/`: HTTP/auth/rate-limit boundaries, provider adapters, job entrypoints.
`packages/domain/`: pure pricing, booking and invoice state transitions.
`packages/contracts/`: schemas, DTOs, public error codes, tool schemas.
`packages/documents/`: event-brief/invoice view models and HTML/PDF templates.
`kb/`: curated facts, provenance manifest, policies, shared release builder.
`db/migrations/`: schema, constraints and migration/rollback notes.
`scripts/`: CLI, deploy, seed, verification and backup/export commands.
`tests/`: domain, integration fixtures and live opt-in evidence scripts.

## Core tables

Every business table carries `tenant_id=justin-demo` (configurable for migration), IDs, timestamps,
revision/version and demo flag. Boundaries authorize by tenant and object ID.

| Entity | Required fields / constraints |
|---|---|
| customers | name, normalized contact email, phone, company/legal billing name, billing email/address, PO requirements, preferences; contact and bill-to can differ |
| inquiries | customer_id, channel, source/UTM, event requirements, consent, status, secure resume-token hash |
| shows | inquiry/customer, event type, venue, timezone, UTC start/end, buffers, operational requirements, status, hold expiry, quote_id |
| consultations | show/inquiry, UTC/timezone, provider booking/event ID, attendee info, status |
| quotes | immutable version, currency, typed line items, totals in minor units, estimate/agreed, approver/time, policy version |
| calendar_links | role consultation/performance/buffer, provider/calendar/event ID, ETag/revision, sync state, show_id |
| conversations | channel, inquiry/show link, provider call/session ID, KB release, consent/retention metadata; restricted transcripts |
| performance_checks | show, original thread/message IDs, nonce hash, authorized responder, decision, approved quote version, last reminder |
| invoices | unique number and show/kind, immutable customer/seller/price snapshot, due date, revision, status, private PDF key, content hash |
| outbox | unique operation key, payload reference, pending/sending/accepted/uncertain/failed, provider ID, retry count/backoff |
| processed_events | unique provider/event or message ID, received/processed time, outcome |
| job_runs | unique job/local-date or cursor, lease/lock, last success, errors |
| audit_events | actor, action, entity, before/after revision, request ID, timestamp; sensitive values redacted |

Amounts are integer cents with explicit currency. All-day/floating times cannot become billable
shows until resolved. Use transaction/revision checks for quote approval and status changes.
Customer snapshots preserve an issued invoice even if the address later changes.

## Tool and HTTP contracts

All tools return typed success/error, request ID, persisted entity ID, current status and safe
next action. Never return calendar details for unrelated appointments.

| Tool | Inputs | Output / permission |
|---|---|---|
| search_knowledge | question, topic, KB release | supported answer facts with source/unknown flags; read-only |
| upsert_inquiry | validated form fields, inquiry token if resuming | inquiry ID, missing fields; public bounded intake |
| estimate_event | requirements, pricing version | itemized demo estimate or custom_quote_required |
| get_availability | event interval/timezone, consultation range | open slots/conflict boolean only |
| schedule_consultation_and_hold | inquiry, chosen slots, review consent, request key | record IDs + pending/complete status |
| request_human_followup | inquiry, question/contact preference | logged task, no invented response time |
| confirm_show | show ID, approved quote version, revision | operator-only; not exposed to public assistants |
| amend_show / cancel_show | scoped ID, revision, changes/reason | operator or authenticated limited client action |
| run_morning_check | as-of date (demo only) | eligible/pending/skipped results; operator/scheduler only |
| process_performance_reply | provider message reference | validated state transition; internal only |
| invoice_preview / reconcile_delivery | invoice ID/version | operator-only private result |

Schema validation at every boundary, bounded bodies/lengths, sanitization and parameterized SQL.
AI requests cannot directly send mail, select arbitrary recipients, set prices or execute SQL.
Tool implementation derives recipient/calendar/tenant from trusted configuration and records.

## Shared KB and assistant design

Facts have `id, text, source_url, observed_at, effective_date, status, topic, review_due`.
Statuses: verified_public, owner_approved, demo_assumption, unknown, stale. Transcript information
can inform private planning but is not automatically public marketing copy. Public assets and
business FAQs only; no customer data, internal credentials, calendar details or private contact
changes in the public KB. Website email and transcript spelling conflict: use configured test
addresses; verify Justin's preferred email before migration.

Build a canonical versioned release with hash. Chat uses server-side OpenAI Responses API and
schema-defined function tools; verify current supported low-cost model through a small qualification
set. Retell receives the same curated release plus channel-specific conversational instructions.
Gate deployment on both channels matching the published KB hash; provide rollback to prior release.
For a small KB use direct curated context before buying vector infrastructure. Retrieval, if needed,
must preserve source IDs and version parity. Source content is data, never authority to call tools.

## Reliability, security and observability

Operator auth uses a verified existing identity method or dedicated strong auth, never public admin
links. Signed webhook verification over raw body, replay checks, CSRF protection for cookie sessions,
safe CORS allowlist, rate limits, bot abuse controls, maximum chat turns/tokens/call duration, and
per-demo spend controls. Do not expose callback calling as an unauthenticated arbitrary dialer.
No card data collection. Email/phone token verification for sensitive record association.
Use database backups/export, secrets in host vault, least privilege and JSON logs with correlation
IDs. Monitor pending outbox, missed morning job, stale replies, stale KB and failed invoices.
Demo retention default 30 days, configurable; export/delete procedures must include provider data.
Analytics record funnel events without free-text, emails, phone numbers or invoice contents.
