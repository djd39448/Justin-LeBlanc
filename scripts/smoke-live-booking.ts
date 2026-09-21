/** Restartable live A09/A12/A13/A14 acceptance flow; keep the worker paused while it runs. */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import { z } from 'zod';

import { MailEffectSchema } from '../apps/api/adapters/email.js';
import { assertRecipients, loadConfig } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';
import {
  ConsultationSchema,
  InquiryInputSchema,
  QuoteSchema,
  ShowSchema,
} from '../packages/contracts/index.js';
import { localDateForInstant } from '../packages/domain/time.js';

const StageSchema = z.enum(['inspect', 'hold', 'confirm', 'reschedule', 'cancel']);

const ManifestSchema = z.object({
  version: z.literal(1),
  runKey: z.string(),
  inquiryId: z.string().nullable(),
  resumeToken: z.string().nullable(),
  showId: z.string().nullable(),
  consultationId: z.string().nullable(),
  quoteId: z.string().nullable(),
  consultationStart: z.iso.datetime({ offset: true }).nullable(),
  performanceStart: z.iso.datetime({ offset: true }).nullable(),
  performanceEnd: z.iso.datetime({ offset: true }).nullable(),
  updatedAt: z.iso.datetime({ offset: true }),
  lastStage: StageSchema,
});
type Manifest = z.infer<typeof ManifestSchema>;

interface Options {
  env: string;
  manifest: string;
  stage: string;
  key: string;
  consultationStart?: string;
  performanceStart?: string;
  performanceEnd?: string;
  rescheduledConsultationStart?: string;
  rescheduledPerformanceStart?: string;
  rescheduledPerformanceEnd?: string;
  timezone: string;
  quoteCents?: string;
  apply?: boolean;
  executeProviders?: boolean;
  workerPaused?: boolean;
}

function emptyManifest(key: string): Manifest {
  return {
    version: 1,
    runKey: key,
    inquiryId: null,
    resumeToken: null,
    showId: null,
    consultationId: null,
    quoteId: null,
    consultationStart: null,
    performanceStart: null,
    performanceEnd: null,
    updatedAt: new Date().toISOString(),
    lastStage: 'inspect',
  };
}

function readManifest(path: string, key: string): Manifest {
  try {
    const manifest = ManifestSchema.parse(JSON.parse(readFileSync(resolve(path), 'utf8')));
    if (manifest.runKey !== key) throw new Error('Manifest belongs to another run key.');
    return manifest;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return emptyManifest(key);
    }
    throw error;
  }
}

function writeManifest(path: string, manifest: Manifest): void {
  const destination = resolve(path);
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.tmp`;
  writeFileSync(
    temporary,
    `${JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  );
  renameSync(temporary, destination);
}

function parseCents(value: string | undefined, name: string): number {
  return z.coerce
    .number()
    .int()
    .nonnegative()
    .parse(
      value ??
        (() => {
          throw new Error(`${name} is required for this stage.`);
        })(),
    );
}

function loadRuntime(path: string): Runtime {
  const environment = parseEnv(readFileSync(resolve(path), 'utf8'));
  return createRuntime(loadConfig({ ...process.env, ...environment }));
}

function requireExecution(options: Options, runtime: Runtime): void {
  if (!options.apply || !options.executeProviders || !options.workerPaused) {
    throw new Error('Live stages require --apply --execute-providers --worker-paused.');
  }
  if (!runtime.config.BOOKING_WRITES_ENABLED) {
    throw new Error('BOOKING_WRITES_ENABLED is false.');
  }
  assertRecipients(runtime.config, [
    runtime.config.CLIENT_TEST_EMAIL,
    runtime.config.OPERATOR_EMAIL,
    runtime.config.PERFORMER_EMAIL,
  ]);
}

function workflowEffects(runtime: Runtime, showId: string | null) {
  return showId === null
    ? []
    : runtime.store.effects().filter((effect) => effect.entity_id === showId);
}

function assertPendingScope(runtime: Runtime, showId: string | null): void {
  const unrelated = runtime.store
    .effects('pending')
    .filter((effect) => showId === null || effect.entity_id !== showId);
  if (unrelated.length > 0) {
    throw new Error(
      `Unrelated pending effects must be cleared first: ${unrelated.map((effect) => effect.id).join(', ')}.`,
    );
  }
}

async function reconcile(runtime: Runtime, showId: string | null): Promise<void> {
  const owned = new Set(workflowEffects(runtime, showId).map((effect) => effect.id));
  const unsafe = runtime.store
    .effects()
    .filter(
      (effect) =>
        (effect.status === 'sending' || effect.status === 'uncertain') && !owned.has(effect.id),
    );
  if (unsafe.length > 0) {
    throw new Error(
      `Unrelated unresolved effects: ${unsafe.map((effect) => effect.id).join(', ')}.`,
    );
  }
  const sending = runtime.store.effects('sending').filter((effect) => owned.has(effect.id));
  if (sending.length > 0) await runtime.outbox.recoverInterrupted();
  for (const effect of runtime.store.effects('uncertain').filter((item) => owned.has(item.id))) {
    await runtime.outbox.reconcileUncertain(effect.id);
  }
  const unresolved = workflowEffects(runtime, showId).filter(
    (effect) =>
      effect.status === 'sending' || effect.status === 'uncertain' || effect.status === 'failed',
  );
  if (unresolved.length > 0) {
    throw new Error(
      `Workflow effects need review: ${unresolved.map((effect) => `${effect.id}:${effect.status}`).join(', ')}.`,
    );
  }
}

function validateMail(runtime: Runtime, effectId: string): void {
  const effect = runtime.store.effects().find((item) => item.id === effectId);
  if (effect === undefined || !effect.kind.startsWith('email.')) return;
  const mail = MailEffectSchema.parse(JSON.parse(effect.payload) as unknown);
  assertRecipients(runtime.config, [...mail.to, ...mail.cc, ...mail.bcc]);
  const recipients = mail.to.map((value) => value.toLowerCase());
  if (
    effect.kind === 'email.event_brief' &&
    !recipients.includes(runtime.config.OPERATOR_EMAIL.toLowerCase())
  ) {
    throw new Error('Event brief recipient does not match the configured operator role.');
  }
  if (
    effect.kind === 'email.booking_confirmation' &&
    !recipients.includes(runtime.config.CLIENT_TEST_EMAIL.toLowerCase())
  ) {
    throw new Error('Booking recipient does not match the configured client role.');
  }
}

async function dispatchExact(runtime: Runtime, showId: string, ids: string[]): Promise<void> {
  for (const id of ids) {
    const current = runtime.store.effects().find((effect) => effect.id === id);
    if (current?.status === 'accepted') continue;
    const pending = runtime.store.effects('pending');
    const next = pending[0];
    if (next === undefined || next.id !== id) {
      throw new Error(`Expected next effect ${id}; found ${next?.id ?? 'none'}.`);
    }
    if (pending.some((effect) => effect.entity_id !== showId)) {
      throw new Error('Unrelated pending effects must be cleared before live dispatch.');
    }
    validateMail(runtime, id);
    const result = await runtime.outbox.dispatchPending(1);
    if (result.accepted !== 1 || result.failed !== 0 || result.uncertain !== 0) {
      throw new Error(`${id} was not definitively accepted; reconcile before continuing.`);
    }
  }
}

function requiredInstant(value: string | undefined, name: string): string {
  if (value === undefined) throw new Error(`${name} is required on the first hold run.`);
  return z.iso.datetime({ offset: true }).parse(value);
}

async function hold(
  runtime: Runtime,
  options: Options,
  manifest: Manifest,
  save: () => void,
): Promise<void> {
  if (manifest.inquiryId === null || manifest.resumeToken === null) {
    const consultationStart = requiredInstant(options.consultationStart, '--consultation-start');
    const performanceStart = requiredInstant(options.performanceStart, '--performance-start');
    const performanceEnd = requiredInstant(options.performanceEnd, '--performance-end');
    const inquiry = runtime.booking.upsertInquiry({
      input: InquiryInputSchema.parse({
        name: 'Synthetic Live Acceptance',
        email: runtime.config.CLIENT_TEST_EMAIL,
        eventType: 'private',
        date: localDateForInstant(performanceStart, options.timezone),
        city: 'Houston',
        venue: 'Synthetic Acceptance Venue',
        durationMinutes: Math.round(
          (Date.parse(performanceEnd) - Date.parse(performanceStart)) / 60000,
        ),
        timezone: options.timezone,
        atmosphere: 'Synthetic acceptance rehearsal',
        consent: true,
        source: 'operator',
      }),
    });
    manifest.inquiryId = inquiry.inquiryId;
    manifest.resumeToken = inquiry.resumeToken;
    manifest.consultationStart = consultationStart;
    manifest.performanceStart = performanceStart;
    manifest.performanceEnd = performanceEnd;
    save();
  }
  if (
    manifest.inquiryId === null ||
    manifest.resumeToken === null ||
    manifest.consultationStart === null ||
    manifest.performanceStart === null ||
    manifest.performanceEnd === null
  ) {
    throw new Error('Manifest is incomplete; preserve it for operator review.');
  }
  const scheduled = await runtime.booking.scheduleConsultationAndHold({
    inquiryId: manifest.inquiryId,
    token: manifest.resumeToken,
    requestKey: `live-hold-${manifest.runKey}`,
    consultationStart: manifest.consultationStart,
    performanceStart: manifest.performanceStart,
    performanceEnd: manifest.performanceEnd,
    timezone: options.timezone,
    reviewConsent: true,
  });
  manifest.showId = scheduled.showId;
  manifest.consultationId = scheduled.consultationId;
  save();
  await reconcile(runtime, scheduled.showId);
  await dispatchExact(runtime, scheduled.showId, [
    `calendar:upsert:${scheduled.showId}:consultation:initial_schedule`,
    `calendar:upsert:${scheduled.showId}:performance:initial_hold`,
    `email:booking:${scheduled.showId}:tentative_hold_created:1`,
    `document:event-brief:${scheduled.showId}:1`,
    `mail:event-brief:${scheduled.showId}:r1`,
  ]);
}

async function confirm(
  runtime: Runtime,
  options: Options,
  manifest: Manifest,
  save: () => void,
): Promise<void> {
  if (manifest.showId === null || manifest.consultationId === null) {
    throw new Error('Hold is absent; run the hold stage first.');
  }
  await reconcile(runtime, manifest.showId);
  const quote = runtime.booking.approveAgreedQuote({
    showId: manifest.showId,
    lines: [
      {
        description: 'Operator-approved synthetic performance',
        quantity: 1,
        unitCents: parseCents(options.quoteCents, '--quote-cents'),
      },
    ],
    depositCents: 0,
    actor: 'operator:live-acceptance',
    requestKey: `live-quote-${manifest.runKey}`,
  });
  manifest.quoteId = quote.id;
  save();
  const consultation = runtime.store.get(
    'consultations',
    manifest.consultationId,
    ConsultationSchema,
  );
  if (consultation.data.status === 'scheduled') {
    runtime.booking.completeConsultation(
      consultation.id,
      consultation.revision,
      'operator:live-acceptance',
    );
  }
  const before = runtime.store.get('shows', manifest.showId, ShowSchema);
  const confirmed =
    before.data.status === 'confirmed'
      ? before
      : await runtime.booking.confirmShow({
          showId: before.id,
          showRevision: before.revision,
          quoteId: quote.id,
          quoteRevision: quote.revision,
          actor: 'operator:live-acceptance',
          requestKey: `live-confirm-${manifest.runKey}`,
        });
  save();
  await dispatchExact(runtime, confirmed.id, [
    `calendar:upsert:${confirmed.id}:performance:operator_confirmation`,
    `email:booking:${confirmed.id}:operator_confirmation:${confirmed.revision}`,
  ]);
}

async function reschedule(
  runtime: Runtime,
  options: Options,
  manifest: Manifest,
  save: () => void,
): Promise<void> {
  if (manifest.showId === null) throw new Error('Confirmed show is absent.');
  const start = requiredInstant(
    options.rescheduledPerformanceStart,
    '--rescheduled-performance-start',
  );
  const end = requiredInstant(options.rescheduledPerformanceEnd, '--rescheduled-performance-end');
  const consultationStart = options.rescheduledConsultationStart;
  await reconcile(runtime, manifest.showId);
  const before = runtime.store.get('shows', manifest.showId, ShowSchema);
  const consultation = runtime.store.get(
    'consultations',
    before.data.consultationId,
    ConsultationSchema,
  );
  const same =
    before.data.start === start &&
    before.data.end === end &&
    (consultationStart === undefined || consultation.data.start === consultationStart);
  const updated = same
    ? before
    : await runtime.booking.rescheduleShow({
        showId: before.id,
        showRevision: before.revision,
        actor: 'operator:live-acceptance',
        performanceStart: start,
        performanceEnd: end,
        ...(consultationStart === undefined ? {} : { consultationStart }),
      });
  manifest.performanceStart = start;
  manifest.performanceEnd = end;
  if (consultationStart !== undefined) manifest.consultationStart = consultationStart;
  save();
  const ids = [
    ...(consultationStart === undefined
      ? []
      : [`calendar:upsert:${updated.id}:consultation:reschedule`]),
    `calendar:upsert:${updated.id}:performance:reschedule`,
    `email:booking:${updated.id}:reschedule:${updated.revision}`,
  ];
  await dispatchExact(runtime, updated.id, ids);
}

async function cancel(runtime: Runtime, manifest: Manifest, save: () => void): Promise<void> {
  if (manifest.showId === null) throw new Error('Show is absent.');
  await reconcile(runtime, manifest.showId);
  const before = runtime.store.get('shows', manifest.showId, ShowSchema);
  const cancelled =
    before.data.status === 'cancelled'
      ? before
      : runtime.booking.cancelShow(before.id, before.revision, 'operator:live-acceptance');
  save();
  await dispatchExact(runtime, cancelled.id, [
    `calendar:cancel:${cancelled.id}:performance`,
    `email:booking:${cancelled.id}:show_cancelled:${cancelled.revision}`,
  ]);
}

async function main(): Promise<void> {
  const options = new Command()
    .name('smoke-live-booking')
    .requiredOption('--env <path>')
    .requiredOption('--manifest <path>')
    .requiredOption('--stage <stage>', 'inspect|hold|confirm|reschedule|cancel')
    .option('--key <key>', 'Stable private run key', 'live-booking-v1')
    .option('--consultation-start <instant>')
    .option('--performance-start <instant>')
    .option('--performance-end <instant>')
    .option('--rescheduled-consultation-start <instant>')
    .option('--rescheduled-performance-start <instant>')
    .option('--rescheduled-performance-end <instant>')
    .option('--timezone <iana>', 'Event timezone', 'America/Chicago')
    .option('--quote-cents <integer>')
    .option('--apply')
    .option('--execute-providers')
    .option('--worker-paused')
    .parse()
    .opts<Options>();
  const stage = StageSchema.parse(options.stage);
  const key = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(1)
    .max(60)
    .parse(options.key);
  const manifest = readManifest(options.manifest, key);
  const runtime = loadRuntime(options.env);
  const save = (): void => {
    manifest.lastStage = stage;
    writeManifest(options.manifest, manifest);
  };
  try {
    if (stage !== 'inspect') {
      requireExecution(options, runtime);
      await reconcile(runtime, manifest.showId);
      assertPendingScope(runtime, manifest.showId);
    }
    if (stage === 'hold') await hold(runtime, options, manifest, save);
    if (stage === 'confirm') await confirm(runtime, options, manifest, save);
    if (stage === 'reschedule') await reschedule(runtime, options, manifest, save);
    if (stage === 'cancel') await cancel(runtime, manifest, save);
    save();
    const show =
      manifest.showId === null
        ? undefined
        : runtime.store.find('shows', manifest.showId, ShowSchema);
    const quote =
      manifest.quoteId === null
        ? undefined
        : runtime.store.find('quotes', manifest.quoteId, QuoteSchema);
    const allEffects = runtime.store.effects();
    process.stdout.write(
      `${JSON.stringify({
        ok: true,
        stage,
        inquiryId: manifest.inquiryId,
        showId: manifest.showId,
        showStatus: show?.data.status ?? null,
        quoteVersion: quote?.data.version ?? null,
        effects: workflowEffects(runtime, manifest.showId).map(({ id, status }) => ({
          id,
          status,
        })),
        outboxBlockers: allEffects
          .filter((effect) => effect.status !== 'accepted')
          .map(({ id, status }) => ({ id, status })),
      })}\n`,
    );
  } finally {
    runtime.store.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : 'Unknown failure.' })}\n`,
  );
  process.exitCode = 1;
});
