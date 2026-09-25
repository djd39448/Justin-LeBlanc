# SQLite schema

`apps/api/store.ts` installs the initial idempotent schema. All named business tables contain a
validated JSON record, tenant, revision and timestamps. Services use Zod on reads and writes.
Unique indexes enforce one invoice/check per show and unique invoice numbers. `BEGIN IMMEDIATE`
serializes reservations and business/outbox transitions. Provider requests occur after commit.

Back up with the CLI before a code/schema deployment. SQLite WAL files must not be copied alone;
the CLI uses SQLite's online backup API. For rollback, stop the dedicated service, retain the current
database as evidence, restore a compatible verified backup and deploy the recorded prior Git SHA.
Never erase the audit ledger to replay an invoice or send. No destructive migration is included.

Round three remains additive within those JSON records and the existing durable outbox. New
inquiries include typed follow-up state for received/due/completed times and the initial,
20-hour, and 24-hour notification markers. Historical inquiries intentionally remain without
that state and stay readable; the follow-up job does not auto-enroll them. The stored inquiry
schema also remains permissive for historical phone text while all new intake uses the strict
phone boundary.

Before the round-three runtime release, use the CLI online-backup command and inspect pending,
sending, uncertain, and failed effects. Deploy the backward-compatible API and worker before the
dependent frontend. Rollback preserves SQLite and all additive records; never reset the database
or blindly replay an uncertain inquiry email.
