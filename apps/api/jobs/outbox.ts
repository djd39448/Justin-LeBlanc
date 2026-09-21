/**
 * Dispatches document, email, and calendar effects with restart-safe uncertainty handling.
 *
 * Dependencies: Store outbox/leases, provider adapters, billing/brief services, and Config gates.
 * Depended on by: scheduler and operator delivery-reconcile command.
 * Why: a crash after provider acceptance must reconcile by stable identity, never blindly resend.
 */
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { CalendarCancelEffectSchema, CalendarUpsertEffectSchema } from '../adapters/calendar.js';
import { MailEffectSchema, UncertainEmailSendError } from '../adapters/email.js';
import { EventBriefPreparationSchema } from '../billing/brief.js';
import { type Config } from '../config.js';
import { type Effect, Store } from '../store.js';

const InvoiceEffectSchema = z.object({ 'X-JLM-Invoice-ID': z.string() }).passthrough();

export interface CalendarEffectAdapter {
  send(kind: string, payload: unknown): Promise<{ providerId: string }>;
  reconcile(
    kind: string,
    payload: unknown,
  ): Promise<{ status: 'accepted' | 'not_found' | 'uncertain'; providerId: string | null }>;
}

export interface OutboxMailSender {
  send(input: z.infer<typeof MailEffectSchema>): Promise<{ providerMessageId: string }>;
}

export interface SentMailReconciler {
  sentContains(messageId: string): Promise<boolean>;
}

export interface BriefPreparer {
  prepare(input: z.infer<typeof EventBriefPreparationSchema>): Promise<{ pdfPath: string }>;
}

export interface InvoiceDeliveryTracker {
  markInvoiceDelivery(input: {
    invoiceId: string;
    status: 'sent' | 'uncertain' | 'failed';
    providerMessageId: string | null;
  }): unknown;
}

export interface OutboxBatchResult {
  accepted: number;
  uncertain: number;
  failed: number;
  skipped: number;
}

/** Routes effects under one batch lease and enforces kill switches at the provider boundary. */
export class OutboxDispatcher {
  constructor(
    private readonly store: Store,
    private readonly smtp: OutboxMailSender,
    private readonly imap: SentMailReconciler,
    private readonly calendar: CalendarEffectAdapter,
    private readonly billing: InvoiceDeliveryTracker,
    private readonly briefs: BriefPreparer,
    private readonly config: Config,
  ) {}

  /** Claims and sends the current pending batch; no effect is retried inside the call. */
  async dispatchPending(maximum = 25): Promise<OutboxBatchResult> {
    return this.withBatchLease(async (renew) => {
      const result = emptyResult();
      const effects = this.store.effects('pending').slice(0, maximum);
      for (const effect of effects) {
        renew();
        try {
          this.assertKillSwitch(effect);
        } catch (error) {
          if (error instanceof DisabledEffectError) {
            result.skipped += 1;
            continue;
          }
          throw error;
        }
        if (!this.store.claimEffect(effect.id)) {
          result.skipped += 1;
          continue;
        }
        try {
          const providerId = await this.send(effect);
          this.store.effectResult(effect.id, 'accepted', providerId, null);
          this.markInvoice(effect, 'sent', providerId);
          result.accepted += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          const uncertain =
            error instanceof UncertainEmailSendError ||
            error instanceof ProviderTimeoutError ||
            effect.kind.startsWith('calendar.');
          this.store.effectResult(effect.id, uncertain ? 'uncertain' : 'failed', null, message);
          this.markInvoice(effect, uncertain ? 'uncertain' : 'failed', null);
          if (uncertain) result.uncertain += 1;
          else result.failed += 1;
        }
      }
      return result;
    });
  }

  /** Reconciles effects left sending by a prior expired batch lease. */
  async recoverInterrupted(): Promise<OutboxBatchResult> {
    return this.withBatchLease(async (renew) => {
      const result = emptyResult();
      for (const effect of this.store.effects('sending')) {
        renew();
        const reconciliation = await this.reconcile(effect);
        if (reconciliation.status === 'accepted') {
          this.store.effectResult(effect.id, 'accepted', reconciliation.providerId, null);
          this.markInvoice(effect, 'sent', reconciliation.providerId);
          result.accepted += 1;
        } else {
          this.store.effectResult(
            effect.id,
            'uncertain',
            reconciliation.providerId,
            'Interrupted provider call was not proven accepted; operator reconciliation is required.',
          );
          this.markInvoice(effect, 'uncertain', reconciliation.providerId);
          result.uncertain += 1;
        }
      }
      return result;
    });
  }

  /** Checks one uncertain effect by Message-ID/provider identity without resending it. */
  async reconcileUncertain(effectId: string): Promise<'accepted' | 'uncertain'> {
    return this.withBatchLease(async (renew) => {
      renew();
      const effect = this.store.effects('uncertain').find((candidate) => candidate.id === effectId);
      if (effect === undefined) {
        throw new Error(`Uncertain effect ${effectId} was not found; inspect the outbox status.`);
      }
      const reconciliation = await this.reconcile(effect);
      if (reconciliation.status === 'accepted') {
        this.store.effectResult(effect.id, 'accepted', reconciliation.providerId, null);
        this.markInvoice(effect, 'sent', reconciliation.providerId);
        return 'accepted';
      }
      return 'uncertain';
    });
  }

  /** Returns one definitively failed pre-provider effect to pending after revalidating it. */
  async retryFailed(effectId: string): Promise<'pending'> {
    return this.withBatchLease(async (renew) => {
      renew();
      const effect = this.store.effects().find((candidate) => candidate.id === effectId);
      if (effect === undefined) {
        throw new Error(`Outbox effect ${effectId} was not found; inspect the outbox status.`);
      }
      if (effect.status !== 'failed') {
        throw new Error(
          `Outbox effect ${effectId} is ${effect.status}; only definitively failed effects can be retried.`,
        );
      }
      if (effect.provider_id !== null) {
        throw new Error(
          `Failed effect ${effectId} has a provider identity; reconcile it instead of retrying.`,
        );
      }

      this.assertKillSwitch(effect);
      this.validatePayload(effect);
      this.store.transaction(() => {
        const changed = this.store.db
          .prepare(
            "UPDATE outbox SET status='pending',provider_id=NULL,error=NULL,updated_at=? WHERE id=? AND status='failed' AND provider_id IS NULL",
          )
          .run(new Date().toISOString(), effect.id).changes;
        if (changed !== 1) {
          throw new Error(
            `Failed effect ${effectId} changed during retry; refresh the outbox status.`,
          );
        }
        this.store.audit('operator', 'outbox.retry_failed', effect.id, {
          kind: effect.kind,
          priorStatus: 'failed',
          attempts: effect.attempts,
        });
      });
      return 'pending' as const;
    });
  }

  private async send(effect: Effect): Promise<string> {
    const payload = JSON.parse(effect.payload) as unknown;
    if (effect.kind === 'document.event_brief') {
      const prepared = await this.briefs.prepare(EventBriefPreparationSchema.parse(payload));
      return prepared.pdfPath;
    }
    if (effect.kind.startsWith('email.')) {
      const sent = await withProviderTimeout(
        this.smtp.send(MailEffectSchema.parse(payload)),
        effect.id,
      );
      return sent.providerMessageId;
    }
    if (effect.kind.startsWith('calendar.')) {
      return (await withProviderTimeout(this.calendar.send(effect.kind, payload), effect.id))
        .providerId;
    }
    throw new Error(
      `No outbox adapter handles ${effect.kind}; register a handler before dispatch.`,
    );
  }

  private validatePayload(effect: Effect): void {
    const payload = JSON.parse(effect.payload) as unknown;
    if (effect.kind === 'document.event_brief') {
      EventBriefPreparationSchema.parse(payload);
      return;
    }
    if (effect.kind.startsWith('email.')) {
      MailEffectSchema.parse(payload);
      return;
    }
    if (effect.kind === 'calendar.upsert') {
      CalendarUpsertEffectSchema.parse(payload);
      return;
    }
    if (effect.kind === 'calendar.cancel') {
      CalendarCancelEffectSchema.parse(payload);
      return;
    }
    throw new Error(
      `No outbox adapter handles ${effect.kind}; register a handler before retrying it.`,
    );
  }

  private async reconcile(
    effect: Effect,
  ): Promise<{ status: 'accepted' | 'not_found' | 'uncertain'; providerId: string | null }> {
    const payload = JSON.parse(effect.payload) as unknown;
    if (effect.kind === 'document.event_brief') {
      const prepared = await this.briefs.prepare(EventBriefPreparationSchema.parse(payload));
      return { status: 'accepted', providerId: prepared.pdfPath };
    }
    if (effect.kind.startsWith('email.')) {
      const mail = MailEffectSchema.parse(payload);
      const accepted = await withProviderTimeout(this.imap.sentContains(mail.messageId), effect.id);
      return {
        status: accepted ? 'accepted' : 'not_found',
        providerId: accepted ? mail.messageId : null,
      };
    }
    if (effect.kind.startsWith('calendar.')) {
      return withProviderTimeout(this.calendar.reconcile(effect.kind, payload), effect.id);
    }
    return { status: 'uncertain', providerId: null };
  }

  private assertKillSwitch(effect: Effect): void {
    if (
      (effect.kind === 'email.invoice' ||
        effect.kind === 'email.amendment_approval' ||
        effect.kind === 'email.performance_reminder') &&
      !this.config.INVOICE_SEND_ENABLED
    ) {
      throw new DisabledEffectError(
        `${effect.kind} blocked at the provider boundary; enable INVOICE_SEND_ENABLED only for an authorized run.`,
      );
    }
    if (effect.kind === 'email.performance_check' && !this.config.MORNING_SCAN_ENABLED) {
      throw new DisabledEffectError(
        'email.performance_check blocked at the provider boundary; enable MORNING_SCAN_ENABLED for an authorized run.',
      );
    }
    if (
      (effect.kind === 'email.booking_confirmation' || effect.kind === 'email.event_brief') &&
      !this.config.BOOKING_WRITES_ENABLED
    ) {
      throw new DisabledEffectError(
        `${effect.kind} blocked at the provider boundary; enable BOOKING_WRITES_ENABLED for an authorized run.`,
      );
    }
    if (effect.kind.startsWith('calendar.')) {
      const payload = z
        .object({ reason: z.string().optional() })
        .passthrough()
        .parse(JSON.parse(effect.payload));
      const amendment = payload.reason === 'approved_invoice_amendment';
      if (amendment && !this.config.INVOICE_SEND_ENABLED) {
        throw new DisabledEffectError(
          'Calendar invoice amendment blocked; enable INVOICE_SEND_ENABLED for an authorized run.',
        );
      }
      if (!amendment && !this.config.BOOKING_WRITES_ENABLED) {
        throw new DisabledEffectError(
          'Calendar booking write blocked; enable BOOKING_WRITES_ENABLED for an authorized run.',
        );
      }
    }
    if (
      effect.kind.startsWith('email.') &&
      ![
        'email.invoice',
        'email.amendment_approval',
        'email.performance_check',
        'email.performance_reminder',
        'email.booking_confirmation',
        'email.event_brief',
      ].includes(effect.kind)
    ) {
      throw new DisabledEffectError(
        `Unrecognized email effect ${effect.kind} is blocked; register an explicit kill-switch policy.`,
      );
    }
  }

  private markInvoice(
    effect: Effect,
    status: 'sent' | 'uncertain' | 'failed',
    providerMessageId: string | null,
  ): void {
    if (effect.kind !== 'email.invoice') return;
    const payload = MailEffectSchema.parse(JSON.parse(effect.payload) as unknown);
    InvoiceEffectSchema.parse(payload.headers);
    this.billing.markInvoiceDelivery({ invoiceId: effect.entity_id, status, providerMessageId });
  }

  private async withBatchLease<T>(operation: (renew: () => void) => Promise<T>): Promise<T> {
    const owner = `outbox-${randomUUID()}`;
    const renew = (): void => {
      if (!this.store.acquireLease('provider:outbox', owner, 90_000)) {
        throw new Error('Provider outbox lease was lost; stop before another external effect.');
      }
    };
    if (!this.store.acquireLease('provider:outbox', owner, 90_000)) {
      throw new Error(
        'Provider outbox is already active; wait for its bounded lease before dispatch or recovery.',
      );
    }
    try {
      return await operation(renew);
    } finally {
      this.store.releaseLease('provider:outbox', owner);
    }
  }
}

class DisabledEffectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisabledEffectError';
  }
}

class ProviderTimeoutError extends Error {
  constructor(effectId: string) {
    super(
      `Provider call for ${effectId} exceeded 45 seconds; reconcile its provider identity before retry.`,
    );
    this.name = 'ProviderTimeoutError';
  }
}

function emptyResult(): OutboxBatchResult {
  return { accepted: 0, uncertain: 0, failed: 0, skipped: 0 };
}

async function withProviderTimeout<T>(promise: Promise<T>, effectId: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new ProviderTimeoutError(effectId)), 45_000);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
