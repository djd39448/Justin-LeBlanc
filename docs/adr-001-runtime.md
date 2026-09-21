# ADR 001 — isolated persistent demo runtime

2026-09-21. Selected Node 24 on the existing Windows host with a dedicated SQLite file and private
document directory, exposed by a new Justin-only Cloudflare Tunnel if the account permits it.
Cloudflare Pages remains the independent frontend. SMTP, IMAP, Chromium PDF rendering and scheduled
jobs run in Node, never on an ephemeral Pages filesystem. SQLite WAL and BEGIN IMMEDIATE serialize
business transitions; provider work runs outside transactions through a durable outbox.

Before external writes, verify host registration, tunnel privilege, backups, recipient identities
and invitation-capable Calendar credentials. If any privilege is absent, record the exact blocked
step and continue offline implementation. Existing production handlers and family calendar remain
read-only. An existing managed Node host may replace Windows without changing the domain contracts.
