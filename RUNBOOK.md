# Runbook contract — fill verified commands/resources during build

Current state: documentation only. No application or demo resources deployed.
Target: https://justinleblancmusic.50by50.dev

## Installation/deployment

Document exact runtime, install, migrate, seed, dev, tests, build and deploy commands; actual
project/API/DB/storage/DNS IDs and secret variable names. Capture deployment SHA/rollback command.
Isolate frontend/API from TrustCore. No secrets in output, evidence or GitHub workflow source.

## Operations

- Morning job 08:00 Houston: inspect last local-date key, selected shows and pending replies.
- Reply worker every 2 minutes: durable cursor/lock, failures and caught-up status. Separate from
  TrustCore lead watcher; survive local chat/session termination.
- Invoices: preview, amendments, uncertain-send reconciliation, correction workflow.
- KB: source verification, version build, FAQ tests, both-channel deployment/hash verification.
- Booking: operator reviews brief/quote, confirms, checks calendar update; reschedule/cancel
  by exact ID/revision with conflict checks and notifications.

## Incidents

Disable affected feature first (invoice send, booking writes, callback, chat/job). Preserve records
and provider IDs. Reconcile possibly sent invoices before retry. Never delete/change existing
TrustCore resources to fix the demo. Roll back new deployments only; use compatible migrations
or verified backup. Report expired auth, mismatched price, missing fields and failed rendering.

## Backup and migration

Authenticated export of records, invoice snapshots, documents and cursors; keep private data out
of Git. Test restore. Inventory all new resources and disable/remove procedures. Cleanup only
synthetic demo IDs; no blanket calendar deletion. Follow docs/INTEGRATIONS.md migration checklist.
