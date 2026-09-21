# Email provider smoke and security review

Reviewed 2026-09-21 against the isolated Justin demo Gmail SMTP/IMAP configuration. No credential,
mailbox content, address, UID, or customer data is recorded here.

## Live provider evidence

- Exactly one synthetic diagnostic SMTP transaction was sent. It was clearly labeled as a Justin
  demo diagnostic and stated that it was not an invoice or payment request.
- The envelope contained one allowlisted To recipient and one allowlisted BCC recipient.
- The deterministic Message-ID was absent from Sent before the transaction and found through IMAP
  after SMTP acceptance. No retry or duplicate send occurred.
- A bounded Inbox scan connected successfully and inspected exactly five UIDs. It emitted no
  subject, sender, body, address, UIDVALIDITY value, or UID in evidence.
- Machine-readable sanitized results are in `email-provider-smoke.json`.

## Security corrections

1. Inbound authorization previously accepted any SPF, DKIM, or DMARC pass token found in the parsed
   Authentication-Results value. A sender-controlled lower header could therefore be mistaken for
   receiver evidence. The adapter now reads only the first raw Authentication-Results header,
   requires Gmail's `mx.google.com` authentication service, and requires DMARC pass aligned to the
   configured operator's From domain. Exact configured sender, Inbox mailbox, thread, nonce/token,
   auto-reply, precedence, and return-path checks still apply.
2. The scan maximum previously counted only messages that parsed as correlated replies. A mailbox
   full of unrelated messages could cause an unbounded fetch. The adapter now counts every inspected
   UID, advances across malformed/unrelated records, and stops at the validated 1-500 item bound.
3. UIDVALIDITY changes now have an explicit SQLite test proving the worker discards the old cursor,
   restarts at UID zero, processes the replacement mailbox, and persists the new cursor only after
   processing. Provider sessions now use bounded connection/greeting/socket timeouts and immediate
   socket close, avoiding a hanging graceful logout.
4. All `calendar.*` effects, including cancellation, are now checked by the booking/invoice kill
   switch at the final provider boundary. Disabled effects remain pending.

## Read-only CLI and worker findings

- `scripts/worker.ts` calls `expireHolds()` every 15 seconds even when `BOOKING_WRITES_ENABLED` is
  false. This can change a tentative show to expired in SQLite while booking writes are disabled.
  The external calendar cancellation is now blocked at the outbox boundary, but the worker should
  gate the domain mutation too.
- `scripts/cli.ts backup` always copies documents into a fixed `documents` child and allows an
  existing destination. Reusing a backup directory can mix stale/private PDFs with a newer database
  snapshot. Require a new empty snapshot directory or a timestamped documents directory.
- The worker writes successful `expire-holds` and `outbox` log lines every 15 seconds even when no
  work occurs. This is operational noise rather than a correctness failure; logging only non-empty
  work or periodic heartbeat summaries would be easier to monitor.
