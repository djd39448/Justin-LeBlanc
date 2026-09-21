/**
 * Runs the restartable synthetic booking-to-invoice acceptance flow.
 *
 * Dependencies: protected runtime config, canonical Store records, durable outbox, Google Calendar,
 * and Gmail. The private manifest is observational; database and provider records remain authority.
 * Direct provider access requires --execute-providers with --apply; state-changing stages also
 * require a paused worker so queued effects cannot be dispatched by another process.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import { z } from 'zod';

import { MailEffectSchema } from '../apps/api/adapters/email.js';
import { assertRecipients, loadConfig, type Config } from '../apps/api/config.js';
import { seedDemo } from '../apps/api/demo-seed.js';
import { runMorningJob } from '../apps/api/jobs/morning.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';
import { ShowSchema } from '../packages/contracts/index.js';
import { InvoiceSchema, PerformanceCheckSchema } from '../packages/domain/billing.js';
import { localDateForInstant } from '../packages/domain/time.js';

const StageSchema = z.enum(['inspect', 'booking', 'morning', 'waiting-reply', 'invoice-reconcile']);
type Stage = z.infer<typeof StageSchema>;

const ManifestSchema = z.object({
  version: z.literal(1),
  seedKey: z.string(),
  showId: z.string(),
  updatedAt: z.iso.datetime({ offset: true }),
  lastStage: StageSchema,
  showStatus: z.string().nullable(),
  checkState: z.string().nullable(),
  invoiceStatus: z.string().nullable(),
  effects: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      status: z.enum(['pending', 'sending', 'accepted', 'uncertain', 'failed']),
      attempts: z.number().int().nonnegative(),
    }),
  ),
});

type Manifest = z.infer<typeof ManifestSchema>;

interface Options {
  env: string;
  manifest: string;
  stage: string;
  key: string;
  apply?: boolean;
  executeProviders?: boolean;
  workerPaused?: boolean;
}

interface WorkflowIds {
  showId: string;
  checkId: string;
  invoiceId: string;
  calendarEffectId: string;
  checkMailEffectId: string;
  invoiceMailEffectId: string;
}

function idsFor(seedKey: string): WorkflowIds {
  const safeKey = seedKey.replace(/[^a-z0-9-]/gi, '').slice(0, 60);
  if (safeKey.length === 0) throw new Error('Seed key must contain a letter, number, or hyphen.');
  const showId = `jlm-demo-${safeKey}`;
  return {
    showId,
    checkId: `show-${showId}`,
    invoiceId: `invoice-${showId}`,
    calendarEffectId: `calendar:seed:${showId}`,
    checkMailEffectId: `mail:performance-check:${showId}`,
    invoiceMailEffectId: `mail:invoice:invoice-${showId}`,
  };
}

function loadRuntime(envPath: string): Runtime {
  const fileEnvironment = parseEnv(readFileSync(resolve(envPath), 'utf8'));
  return createRuntime(loadConfig({ ...process.env, ...fileEnvironment }));
}

function assertPrivateRoles(config: Config): void {
  assertRecipients(config, [
    config.OPERATOR_EMAIL,
    config.PERFORMER_EMAIL,
    config.CLIENT_TEST_EMAIL,
  ]);
}

function readManifest(path: string, ids: WorkflowIds, seedKey: string): Manifest | undefined {
  try {
    const manifest = ManifestSchema.parse(JSON.parse(readFileSync(resolve(path), 'utf8')));
    if (manifest.seedKey !== seedKey || manifest.showId !== ids.showId) {
      throw new Error(
        'Private manifest identifies a different seed; use its original key or path.',
      );
    }
    return manifest;
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? error.code : undefined;
    if (code === 'ENOENT') return undefined;
    throw error;
  }
}

function workflowEffectIds(ids: WorkflowIds): Set<string> {
  return new Set([ids.calendarEffectId, ids.checkMailEffectId, ids.invoiceMailEffectId]);
}

function assertNoUnrelatedPending(runtime: Runtime, ids: WorkflowIds): void {
  const allowed = workflowEffectIds(ids);
  const unrelated = runtime.store.effects('pending').filter((effect) => !allowed.has(effect.id));
  if (unrelated.length > 0) {
    throw new Error(
      `Provider dispatch blocked by unrelated pending effects: ${unrelated.map((effect) => effect.id).join(', ')}.`,
    );
  }
}

async function reconcileBeforeProvider(runtime: Runtime, ids: WorkflowIds): Promise<void> {
  const allowed = workflowEffectIds(ids);
  const sending = runtime.store.effects('sending');
  const unrelatedSending = sending.filter((effect) => !allowed.has(effect.id));
  if (unrelatedSending.length > 0) {
    throw new Error(
      `Provider recovery blocked by unrelated sending effects: ${unrelatedSending.map((effect) => effect.id).join(', ')}.`,
    );
  }
  if (sending.length > 0) await runtime.outbox.recoverInterrupted();

  const uncertain = runtime.store.effects('uncertain');
  const unrelatedUncertain = uncertain.filter((effect) => !allowed.has(effect.id));
  if (unrelatedUncertain.length > 0) {
    throw new Error(
      `Provider work blocked by unrelated uncertain effects: ${unrelatedUncertain.map((effect) => effect.id).join(', ')}.`,
    );
  }
  for (const effect of uncertain) await runtime.outbox.reconcileUncertain(effect.id);

  const unresolved = runtime.store
    .effects()
    .filter(
      (effect) =>
        allowed.has(effect.id) &&
        (effect.status === 'sending' ||
          effect.status === 'uncertain' ||
          effect.status === 'failed'),
    );
  if (unresolved.length > 0) {
    throw new Error(
      `Workflow has unresolved effects: ${unresolved.map((effect) => `${effect.id}:${effect.status}`).join(', ')}.`,
    );
  }
}

function assertMailRecipients(runtime: Runtime, effectId: string, kind: string): void {
  const effect = runtime.store.effects().find((candidate) => candidate.id === effectId);
  if (effect === undefined || effect.kind !== kind) {
    throw new Error(`Expected ${kind} effect ${effectId} was not found.`);
  }
  const mail = MailEffectSchema.parse(JSON.parse(effect.payload) as unknown);
  assertRecipients(runtime.config, [...mail.to, ...mail.cc, ...mail.bcc]);
  const normalize = (value: string): string => value.toLowerCase();
  if (kind === 'email.performance_check') {
    if (!mail.to.map(normalize).includes(normalize(runtime.config.OPERATOR_EMAIL))) {
      throw new Error('Performance check recipient does not match the configured operator role.');
    }
  } else if (
    !mail.to.map(normalize).includes(normalize(runtime.config.CLIENT_TEST_EMAIL)) ||
    !mail.bcc.map(normalize).includes(normalize(runtime.config.OPERATOR_EMAIL))
  ) {
    throw new Error('Invoice To/BCC recipients do not match the configured demo roles.');
  }
}

async function dispatchOnly(runtime: Runtime, ids: WorkflowIds, expectedId: string): Promise<void> {
  assertNoUnrelatedPending(runtime, ids);
  const pending = runtime.store.effects('pending');
  const unexpected = pending.filter((effect) => effect.id !== expectedId);
  if (unexpected.length > 0) {
    throw new Error(
      `Stage expected only ${expectedId}; pending set also contains ${unexpected.map((effect) => effect.id).join(', ')}.`,
    );
  }
  if (pending.length === 0) return;
  const result = await runtime.outbox.dispatchPending(1);
  if (result.accepted !== 1 || result.failed !== 0 || result.uncertain !== 0) {
    throw new Error(
      `${expectedId} was not definitively accepted; inspect and reconcile its status.`,
    );
  }
}

function nextHoustonDate(showEnd: string): string {
  const localEndDate = localDateForInstant(showEnd, 'America/Chicago');
  const next = new Date(`${localEndDate}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

async function runStage(
  runtime: Runtime,
  stage: Stage,
  ids: WorkflowIds,
  seedKey: string,
  apply: boolean,
  executeProviders: boolean,
): Promise<Record<string, unknown>> {
  if (executeProviders && !apply) {
    throw new Error('--execute-providers requires --apply.');
  }
  if (stage === 'inspect') {
    const effects = runtime.store.effects();
    return {
      inspected: true,
      outbox: {
        pending: effects.filter((effect) => effect.status === 'pending').length,
        sending: effects.filter((effect) => effect.status === 'sending').length,
        uncertain: effects.filter((effect) => effect.status === 'uncertain').length,
        failed: effects.filter((effect) => effect.status === 'failed').length,
      },
      unresolved: effects
        .filter(
          (effect) =>
            effect.status === 'sending' ||
            effect.status === 'uncertain' ||
            effect.status === 'failed',
        )
        .map(({ id, status }) => ({ id, status })),
    };
  }
  if (!apply) return { planned: true, requiresApply: true };

  if (stage === 'waiting-reply') {
    throw new Error(
      'The current calendar-driven invoice policy needs no performer reply; use morning then invoice-reconcile.',
    );
  }

  if (stage === 'booking') {
    if (executeProviders) await reconcileBeforeProvider(runtime, ids);
    const seeded = seedDemo(runtime, seedKey);
    if (!executeProviders)
      return { seeded: true, replayed: seeded.replayed, providerDispatch: false };
    if (!runtime.config.BOOKING_WRITES_ENABLED) {
      throw new Error('Booking provider gate is disabled.');
    }
    await dispatchOnly(runtime, ids, ids.calendarEffectId);
    return { seeded: true, replayed: seeded.replayed, providerDispatch: true };
  }

  const show = runtime.store.find('shows', ids.showId, ShowSchema);
  if (show === undefined) throw new Error('Synthetic show is absent; run the booking stage first.');
  if (!executeProviders) return { planned: true, requiresProviderExecution: true };
  await reconcileBeforeProvider(runtime, ids);

  if (stage === 'morning') {
    if (!runtime.config.MORNING_SCAN_ENABLED) throw new Error('Morning provider gate is disabled.');
    const calendar = runtime.store
      .effects()
      .find((effect) => effect.id === ids.calendarEffectId && effect.status === 'accepted');
    if (calendar === undefined) {
      throw new Error('Calendar seed is not accepted; finish the booking stage first.');
    }
    const result = await runMorningJob(runtime.store, runtime.billing, {
      workerId: `acceptance-${ids.showId}`,
      asOfLocalDate: nextHoustonDate(show.data.end),
      force: true,
    });
    assertMailRecipients(runtime, ids.invoiceMailEffectId, 'email.invoice');
    await dispatchOnly(runtime, ids, ids.invoiceMailEffectId);
    return { morning: result, providerDispatch: true };
  }

  if (!runtime.config.INVOICE_SEND_ENABLED) throw new Error('Invoice provider gate is disabled.');
  const invoice = runtime.store.find('invoices', ids.invoiceId, InvoiceSchema);
  if (invoice === undefined)
    throw new Error('Invoice is absent; finish the calendar-driven morning stage first.');
  if (invoice.data.status === 'approved')
    await runtime.billing.prepareInvoiceDelivery(ids.invoiceId);
  assertMailRecipients(runtime, ids.invoiceMailEffectId, 'email.invoice');
  await reconcileBeforeProvider(runtime, ids);
  await dispatchOnly(runtime, ids, ids.invoiceMailEffectId);
  const effect = runtime.store
    .effects()
    .find((candidate) => candidate.id === ids.invoiceMailEffectId);
  if (effect?.status !== 'accepted') {
    throw new Error('Invoice effect is not accepted; reconcile it before any retry.');
  }
  const mail = MailEffectSchema.parse(JSON.parse(effect.payload) as unknown);
  const sentCopyVerified = await runtime.imap.sentContains(mail.messageId);
  const finalInvoice = runtime.store.get('invoices', ids.invoiceId, InvoiceSchema);
  if (finalInvoice.data.status !== 'sent') {
    throw new Error(
      'Invoice effect is accepted but canonical invoice is not sent; stop for operator review.',
    );
  }
  return { invoiceStatus: finalInvoice.data.status, sentCopyVerified };
}

function snapshot(runtime: Runtime, ids: WorkflowIds, seedKey: string, stage: Stage): Manifest {
  const show = runtime.store.find('shows', ids.showId, ShowSchema);
  const check = runtime.store.find('performance_checks', ids.checkId, PerformanceCheckSchema);
  const invoice = runtime.store.find('invoices', ids.invoiceId, InvoiceSchema);
  const allowed = workflowEffectIds(ids);
  return ManifestSchema.parse({
    version: 1,
    seedKey,
    showId: ids.showId,
    updatedAt: new Date().toISOString(),
    lastStage: stage,
    showStatus: show?.data.status ?? null,
    checkState: check?.data.state ?? null,
    invoiceStatus: invoice?.data.status ?? null,
    effects: runtime.store
      .effects()
      .filter((effect) => allowed.has(effect.id))
      .map(({ id, kind, status, attempts }) => ({ id, kind, status, attempts })),
  });
}

function writeManifest(path: string, manifest: Manifest): void {
  const destination = resolve(path);
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
  renameSync(temporary, destination);
}

async function main(): Promise<void> {
  const options = new Command()
    .name('smoke-booking-billing')
    .description('Restartable synthetic Calendar-to-invoice acceptance runner')
    .requiredOption('--env <path>', 'Protected runtime env')
    .requiredOption('--manifest <path>', 'Private restart manifest outside Git')
    .requiredOption('--stage <stage>', 'inspect|booking|morning|invoice-reconcile')
    .option('--key <key>', 'Stable synthetic seed key', 'rehearsal-v1')
    .option('--apply', 'Apply durable local state transitions')
    .option('--execute-providers', 'Allow bounded Calendar/Gmail provider operations')
    .option('--worker-paused', 'Assert the owned worker and child are stopped for live stages')
    .parse()
    .opts<Options>();
  const stage = StageSchema.parse(options.stage);
  if (options.apply && stage !== 'inspect' && !options.workerPaused) {
    throw new Error(
      'State-changing runner stages require --worker-paused; use normal operator actions with a running worker.',
    );
  }
  const ids = idsFor(options.key);
  readManifest(options.manifest, ids, options.key);
  const runtime = loadRuntime(options.env);
  try {
    assertPrivateRoles(runtime.config);
    const result = await runStage(
      runtime,
      stage,
      ids,
      options.key,
      options.apply === true,
      options.executeProviders === true,
    );
    const manifest = snapshot(runtime, ids, options.key, stage);
    writeManifest(options.manifest, manifest);
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        stage,
        showId: ids.showId,
        showStatus: manifest.showStatus,
        checkState: manifest.checkState,
        invoiceStatus: manifest.invoiceStatus,
        effects: manifest.effects,
        result,
      })}\n`,
    );
  } finally {
    runtime.store.close();
  }
}

void main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : 'Unknown acceptance runner failure.';
  process.stderr.write(`${JSON.stringify({ ok: false, reason })}\n`);
  process.exitCode = 1;
});
