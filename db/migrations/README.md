# SQLite schema

`apps/api/store.ts` installs the initial idempotent schema. All named business tables contain a
validated JSON record, tenant, revision and timestamps. Services use Zod on reads and writes.
Unique indexes enforce one invoice/check per show and unique invoice numbers. `BEGIN IMMEDIATE`
serializes reservations and business/outbox transitions. Provider requests occur after commit.

Back up with the CLI before a code/schema deployment. SQLite WAL files must not be copied alone;
the CLI uses SQLite's online backup API. For rollback, stop the dedicated service, retain the current
database as evidence, restore a compatible verified backup and deploy the recorded prior Git SHA.
Never erase the audit ledger to replay an invoice or send. No destructive migration is included.
