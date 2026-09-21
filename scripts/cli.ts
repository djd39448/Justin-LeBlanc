/** Runs operator commands against the same services as HTTP.
 * Dependencies: Commander, runtime, config, operator actions and SQLite backup.
 * Consumers: operators and scheduled tasks. Why: every UI action remains reproducible without UI. */
import { constants } from 'node:fs';
import { readFile, mkdir, writeFile, cp, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';

import { Command } from 'commander';

import { loadConfig } from '../apps/api/config.js';
import { operatorAction } from '../apps/api/operator-actions.js';
import { createRuntime } from '../apps/api/runtime.js';
import { TableSchema } from '../packages/contracts/index.js';

const program = new Command()
  .name('jlm-demo')
  .description(
    'Isolated Justin demo operator CLI. Load server secrets with node --env-file before invoking.',
  )
  .version('0.1.0')
  .option('--json', 'Machine-readable output');
program
  .command('health')
  .description('Show configured capabilities without exposing secrets')
  .action(() =>
    withRuntime(async (r) => ({
      demo: r.config.DEMO_MODE,
      kbVersion: r.knowledge.version,
      kbHash: r.knowledge.hash,
      booking: r.config.BOOKING_WRITES_ENABLED,
      chat: r.config.AI_ENABLED,
      voice: r.config.VOICE_ENABLED,
      pending: r.store.effects('pending').length,
      uncertain: r.store.effects('uncertain').length,
    })),
  );
program
  .command('action')
  .description('Execute one validated operator action from a JSON file; see RUNBOOK for examples')
  .requiredOption('--file <path>', 'Action JSON; never put a bearer token here')
  .action((opts: { file: string }) =>
    withRuntime(async (r) =>
      operatorAction(r, JSON.parse(await readFile(opts.file, 'utf8')) as unknown),
    ),
  );
program
  .command('backup')
  .description('Create a consistent SQLite snapshot; private PDFs remain in private storage')
  .requiredOption('--directory <path>', 'Private backup directory')
  .action((opts: { directory: string }) =>
    withRuntime(async (r) => {
      const dir = resolve(opts.directory);
      await mkdir(dir, { recursive: true });
      const file = resolve(
        dir,
        `jlm-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.sqlite`,
      );
      await backup(r.store.db, file);
      await cp(r.config.PRIVATE_STORAGE_PATH, resolve(dir, 'documents'), {
        recursive: true,
        force: false,
        errorOnExist: false,
      }).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      return { backup: file, documents: resolve(dir, 'documents') };
    }),
  );
program
  .command('export')
  .description('Export sensitive tenant records for secure migration, never to Git')
  .requiredOption('--directory <path>', 'Private output directory')
  .action((opts: { directory: string }) =>
    withRuntime(async (r) => {
      const dir = resolve(opts.directory);
      await mkdir(dir, { recursive: true });
      for (const table of TableSchema.options) {
        const records = r.store.db
          .prepare(`SELECT * FROM ${table} WHERE tenant_id=?`)
          .all('justin-demo');
        await writeFile(resolve(dir, `${table}.json`), JSON.stringify(records, null, 2), {
          mode: 0o600,
        });
      }
      return { directory: dir, tables: TableSchema.options.length };
    }),
  );
program
  .command('recover')
  .description('Reconcile interrupted effects without resending uncertain email')
  .action(() => withRuntime((r) => r.outbox.recoverInterrupted()));
program
  .command('restore-check')
  .description(
    'Restore a snapshot into a NEW private directory and check integrity; never starts jobs or overwrites live data',
  )
  .requiredOption('--file <path>', 'Backup SQLite path')
  .requiredOption('--directory <path>', 'New restore directory')
  .action(async (opts: { file: string; directory: string }) => {
    const dir = resolve(opts.directory);
    await mkdir(dir, { recursive: true });
    const restored = resolve(dir, 'jlm-demo.sqlite');
    await copyFile(resolve(opts.file), restored, constants.COPYFILE_EXCL);
    const db = new DatabaseSync(restored, { readOnly: true });
    try {
      const checks = db.prepare('PRAGMA integrity_check').all();
      const tables = Object.fromEntries(
        TableSchema.options.map((table) => [
          table,
          db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()?.count,
        ]),
      );
      if (checks.some((row) => row.integrity_check !== 'ok'))
        throw new Error('Restored database failed integrity check; leave live data untouched.');
      process.stdout.write(JSON.stringify({ ok: true, restored, checks, tables }) + '\n');
    } finally {
      db.close();
    }
  });

/** Ensures each command releases database handles and emits one result envelope. */
async function withRuntime<T>(
  operation: (runtime: ReturnType<typeof createRuntime>) => Promise<T>,
): Promise<void> {
  const runtime = createRuntime(loadConfig());
  try {
    const result = await operation(runtime);
    process.stdout.write(
      JSON.stringify({ ok: true, result }, null, program.opts()['json'] ? undefined : 2) + '\n',
    );
  } finally {
    runtime.store.close();
  }
}
try {
  await program.parseAsync(process.argv);
} catch (error) {
  console.error(
    JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Command failed' }),
  );
  process.exitCode = 1;
}
