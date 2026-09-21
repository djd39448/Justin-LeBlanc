# Email and Delivery Safety

This note records the implemented delivery model and the provider behavior verified for the isolated demo. It is an engineering reference, not proof that a live invoice workflow has been accepted.

## Delivery contract

Business code enqueues a complete, versioned mail effect in the same SQLite transaction as the state change that caused it. The effect contains the intended template data, recipients, attachment reference, and a deterministic logical identity. Documents are rendered and stored before an effect that references them is eligible for SMTP delivery.

The dispatcher claims durable effects under a lease. At the final provider boundary it rechecks the relevant feature gate and the exact demo recipient allowlist. SMTP uses the intended `To` recipient plus the required BCC; internal event briefs are addressed only to the operator. An earlier API or workflow check cannot bypass the final boundary.

Every logical message has a deterministic RFC Message-ID. That ID is the reconciliation key across local state and the authenticated Sent mailbox.

## Uncertain send rule

SMTP success and process durability are separate events. The process may stop after the provider accepts a message but before SQLite records `sent`. Treating that case as ordinary failure can duplicate an invoice or authorization request.

The implementation therefore follows these states:

1. A worker atomically claims a pending effect and records `sending`.
2. SMTP submits the message with its deterministic Message-ID and bounded connection, greeting, socket, and close timeouts.
3. A clean accepted result records `sent`.
4. Startup recovery moves an interrupted `sending` effect into reconciliation rather than back to pending.
5. Reconciliation searches the authenticated Sent mailbox for the exact Message-ID.
6. A matching sent copy records `sent`. An absence, provider error, ambiguous search, or incomplete scan leaves the effect uncertain for operator investigation.

An uncertain effect is never automatically resent. Operators preserve the effect ID and Message-ID, run `recover`, then execute `outbox-reconcile` for the exact effect. Manual replacement messages, edited Message-IDs, and direct database state changes break the proof and are prohibited.

An effect classified `failed` is different: it represents a definitive pre-provider failure, with no provider identity. Its explicit manual retry path takes the outbox batch lease, rechecks the current kill switch, validates the stored payload schema, atomically returns only that failed effect to pending, and records an audit event. It rejects uncertain and all other states. The existing attempt count remains available for review.

## Reply authorization

An email reply can change billing state only when all binding checks pass:

- the envelope and parsed author match the configured performer identity;
- the message is a reply to a known outbound authorization request through `In-Reply-To`;
- the expected nonce binds it to the show and quote version;
- the top raw trusted `Authentication-Results` header was added by the configured mailbox provider;
- DMARC passed and its evaluated header-from domain aligns with the parsed From domain;
- the body grammar is an unambiguous `YES`, `NO`, or supported change instruction for that request.

The subject is display text and never an authorization factor. Polite agreement language such as “sounds great,” “that works,” “we are all set,” or “prepare the contract” does not establish that a performance occurred and does not authorize an invoice.

Sent echoes, automatic responses, delivery-status notifications, bounce-like traffic, messages from other senders, stale version replies, duplicate Message-IDs, missing nonces, and unrelated replies are ignored or recorded for review without advancing billing state.

## Durable IMAP scanning

The inbox worker stores mailbox UIDVALIDITY and the last processed UID in SQLite. It takes a lease before polling, fetches a bounded range, and advances the cursor only after each inspected message reaches a durable outcome. This makes normal retries idempotent and prevents two workers from approving the same reply.

A UIDVALIDITY change is a mailbox reset signal, not permission to skip or replay traffic. The worker stops short of unsafe cursor assumptions. Operators must preserve the database and sanitized logs and investigate before any cursor repair. The scan remains bounded so provider anomalies cannot turn a poll into an unreviewed mailbox-wide replay.

## Invoice and document integrity

Performer approval is tied to the quote version sent for review. A requested change creates a new version and requires new approval. Invoice data is copied into an immutable snapshot with a stored sequence number; later customer or quote edits do not rewrite an issued document. Customer billing details come from the canonical customer record and agreed quote only.

HTML, plain text, and PDF outputs use shared typed templates. Event brief preparation finishes the stored PDF before the complete email effect is enqueued, preventing an outbox item from referring to a missing attachment.

## Verified provider diagnostic

On 2026-09-21, one clearly labeled synthetic diagnostic was sent through the configured real SMTP provider to the approved demo recipients. It used the intended To plus BCC shape and a deterministic Message-ID. The authenticated IMAP adapter found the provider's Sent copy, and a separate bounded inbox scan completed safely. Sanitized evidence is stored under `docs/evidence/`.

This diagnostic proves the configured SMTP and IMAP credentials could reach the provider, the envelope shape was accepted, and deterministic Sent-copy reconciliation worked for that message. It does not prove an authenticated performer reply, calendar-backed completed show, invoice snapshot, invoice PDF, or live invoice delivery. Those remain part of the pending end-to-end acceptance run.

## Operator procedure

Use the commands in [the runbook](../RUNBOOK.md) with a protected environment file outside the repository. For an interrupted send:

1. stop competing workers if state is unclear;
2. preserve the database, effect ID, Message-ID, and private logs;
3. run the CLI `recover` command;
4. run `outbox-reconcile` for the exact effect ID;
5. dispatch only after the stored reconciliation outcome is definitive.

Keep sanitized evidence factual: record timestamps, effect state transitions, result categories, and checks performed. Omit addresses, tokens, OAuth material, raw private message content, provider IDs that grant access, and generated customer documents.
