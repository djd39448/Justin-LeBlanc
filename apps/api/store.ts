/** Durable tenant-scoped records and transactional outbox.
 * Dependencies: node:sqlite, Zod and contracts. Consumers: domain services, jobs, API and CLI.
 * Why: one writer lock and optimistic revisions prevent duplicate state and external effects. */
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { z } from 'zod';

import { TableSchema, TENANT, type Entity, type Table } from '../../packages/contracts/index.js';

const RowSchema = z.object({
  id: z.string(),
  revision: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
  data: z.string(),
});
export const EffectSchema = z.object({
  id: z.string(),
  kind: z.string(),
  entity_id: z.string(),
  payload: z.string(),
  status: z.enum(['pending', 'sending', 'accepted', 'uncertain', 'failed']),
  provider_id: z.string().nullable(),
  attempts: z.number(),
  error: z.string().nullable(),
});
export type Effect = z.infer<typeof EffectSchema>;

/** A single persistent database. All transaction callbacks must be synchronous. */
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;');
    for (const table of TableSchema.options)
      this.db.exec(
        `CREATE TABLE IF NOT EXISTS ${table} (id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL DEFAULT '${TENANT}',revision INTEGER NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,data TEXT NOT NULL CHECK(json_valid(data)))`,
      );
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS outbox(id TEXT PRIMARY KEY,kind TEXT NOT NULL,entity_id TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',provider_id TEXT,attempts INTEGER NOT NULL DEFAULT 0,error TEXT,updated_at TEXT NOT NULL);
      CREATE UNIQUE INDEX IF NOT EXISTS invoice_show_unique ON invoices(json_extract(data,'$.showId'));
      CREATE UNIQUE INDEX IF NOT EXISTS invoice_number_unique ON invoices(json_extract(data,'$.number'));
      CREATE UNIQUE INDEX IF NOT EXISTS performance_check_show ON performance_checks(json_extract(data,'$.showId'));
      CREATE TABLE IF NOT EXISTS counters(name TEXT PRIMARY KEY,value INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS leases(name TEXT PRIMARY KEY,owner TEXT NOT NULL,expires_at INTEGER NOT NULL);`);
  }
  /** Runs an atomic synchronous transition, rolling back on validation or revision failures. */
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      if (result instanceof Promise)
        throw new Error(
          'Store.transaction requires synchronous callback; perform provider I/O outside lock.',
        );
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  /** Creates a validated service-owned record. Args: table/id/data. Returns persisted envelope. */
  insert<T>(table: Table, id: string, data: T): Entity<T> {
    TableSchema.parse(table);
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO ${table}(id,tenant_id,revision,created_at,updated_at,data) VALUES(?,?,1,?,?,?)`,
      )
      .run(id, TENANT, now, now, JSON.stringify(data));
    return { id, revision: 1, createdAt: now, updatedAt: now, data };
  }
  /** Fetches and validates a required record; missing or malformed records fail explicitly. */
  get<T>(table: Table, id: string, schema: z.ZodType<T>): Entity<T> {
    const record = this.find(table, id, schema);
    if (!record) throw new Error(`Record ${table}/${id} not found; refresh the record list.`);
    return record;
  }
  /** Finds an optional record. Undefined means absent, never a swallowed database failure. */
  find<T>(table: Table, id: string, schema: z.ZodType<T>): Entity<T> | undefined {
    TableSchema.parse(table);
    const raw = this.db
      .prepare(`SELECT * FROM ${table} WHERE id=? AND tenant_id=?`)
      .get(id, TENANT);
    return raw === undefined ? undefined : this.decode(raw, schema);
  }
  /** Lists tenant records with boundary schema validation. */
  all<T>(table: Table, schema: z.ZodType<T>): Entity<T>[] {
    TableSchema.parse(table);
    return this.db
      .prepare(`SELECT * FROM ${table} WHERE tenant_id=? ORDER BY created_at,id`)
      .all(TENANT)
      .map((row) => this.decode(row, schema));
  }
  /** Replaces data only at expected revision. Concurrent changes require an operator refresh. */
  update<T>(table: Table, id: string, revision: number, data: T): Entity<T> {
    TableSchema.parse(table);
    const now = new Date().toISOString();
    const result = this.db
      .prepare(
        `UPDATE ${table} SET data=?,revision=revision+1,updated_at=? WHERE id=? AND tenant_id=? AND revision=?`,
      )
      .run(JSON.stringify(data), now, id, TENANT, revision);
    if (result.changes !== 1)
      throw new Error(`Revision conflict in ${table}/${id}; refresh before retrying.`);
    const row = RowSchema.parse(
      this.db.prepare(`SELECT * FROM ${table} WHERE id=? AND tenant_id=?`).get(id, TENANT),
    );
    return { id, revision: row.revision, createdAt: row.created_at, updatedAt: now, data };
  }
  /** Adds one idempotent provider effect in the caller's business transaction. */
  enqueue(id: string, kind: string, entityId: string, payload: unknown): void {
    this.db
      .prepare(
        'INSERT INTO outbox(id,kind,entity_id,payload,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO NOTHING',
      )
      .run(id, kind, entityId, JSON.stringify(payload), new Date().toISOString());
  }
  /** Returns effects for an optional status. Sensitive payloads are operator-only. */
  effects(status?: Effect['status']): Effect[] {
    const rows =
      status === undefined
        ? this.db.prepare('SELECT * FROM outbox ORDER BY rowid').all()
        : this.db.prepare('SELECT * FROM outbox WHERE status=? ORDER BY rowid').all(status);
    return rows.map((row) => EffectSchema.parse(row));
  }
  /** Marks an external outcome; uncertain effects must reconcile before being sent again. */
  effectResult(
    id: string,
    status: Effect['status'],
    providerId: string | null,
    error: string | null,
  ): void {
    this.db
      .prepare('UPDATE outbox SET status=?,provider_id=?,error=?,updated_at=? WHERE id=?')
      .run(status, providerId, error, new Date().toISOString(), id);
  }
  /** Atomically claims a pending effect for a single sender. */
  claimEffect(id: string): boolean {
    return (
      this.db
        .prepare(
          "UPDATE outbox SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND status='pending'",
        )
        .run(new Date().toISOString(), id).changes === 1
    );
  }
  /** Generates a sequential number inside the caller's transaction. */
  nextSequence(name: string): number {
    const row = this.db
      .prepare(
        'INSERT INTO counters(name,value) VALUES(?,1) ON CONFLICT(name) DO UPDATE SET value=value+1 RETURNING value',
      )
      .get(name);
    return z.object({ value: z.number() }).parse(row).value;
  }
  /** Records a redacted domain action alongside its transaction. */
  audit(
    actor: string,
    action: string,
    entityId: string,
    details: Record<string, unknown> = {},
  ): void {
    this.insert('audit_events', randomUUID(), { actor, action, entityId, details });
  }
  /** Acquires a durable bounded job lease; expired owners cannot renew another owner's lease. */
  acquireLease(name: string, owner: string, ttlMs: number, now = Date.now()): boolean {
    return (
      this.db
        .prepare(
          'INSERT INTO leases(name,owner,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE leases.expires_at<? OR leases.owner=?',
        )
        .run(name, owner, now + ttlMs, now, owner).changes === 1
    );
  }
  /** Releases only the caller's lease. */
  releaseLease(name: string, owner: string): void {
    this.db.prepare('DELETE FROM leases WHERE name=? AND owner=?').run(name, owner);
  }
  /** Closes this connection after jobs/tests. */
  close(): void {
    this.db.close();
  }
  private decode<T>(raw: unknown, schema: z.ZodType<T>): Entity<T> {
    const row = RowSchema.parse(raw);
    return {
      id: row.id,
      revision: row.revision,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      data: schema.parse(JSON.parse(row.data)),
    };
  }
}
