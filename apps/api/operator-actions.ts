/** Validates and routes authenticated operator commands shared by HTTP and CLI.
 * Dependencies: Runtime, contracts, jobs and synthetic seeding. Consumers: operator routes.
 * Why: one command implementation keeps UI and CLI behavior aligned. */
import { z } from 'zod';

import { CustomerSchema, LineItemSchema } from '../../packages/contracts/index.js';

import { seedDemo } from './demo-seed.js';
import { runImapReplyJob } from './jobs/imap.js';
import { runMorningJob } from './jobs/morning.js';
import type { Runtime } from './runtime.js';

const id = z.string().min(1).max(200);
const revision = z.number().int().positive();
const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('customer-update'), id, revision, data: CustomerSchema }),
  z.object({ action: z.literal('consultation-complete'), id, revision }),
  z.object({
    action: z.literal('quote-approve'),
    showId: id,
    lines: z.array(LineItemSchema).min(1).max(30),
    depositCents: z.number().int().nonnegative().optional(),
    requestKey: id,
  }),
  z.object({
    action: z.literal('show-confirm'),
    showId: id,
    showRevision: revision,
    quoteId: id,
    quoteRevision: revision,
    requestKey: id,
  }),
  z.object({ action: z.literal('show-cancel'), id, revision }),
  z.object({
    action: z.literal('show-reschedule'),
    showId: id,
    showRevision: revision,
    performanceStart: z.iso.datetime({ offset: true }),
    performanceEnd: z.iso.datetime({ offset: true }),
    consultationStart: z.iso.datetime({ offset: true }).optional(),
  }),
  z.object({ action: z.literal('holds-expire') }),
  z.object({
    action: z.literal('morning'),
    asOfLocalDate: z.iso.date().optional(),
    force: z.boolean().default(true),
  }),
  z.object({ action: z.literal('replies-poll') }),
  z.object({ action: z.literal('outbox-dispatch') }),
  z.object({ action: z.literal('outbox-reconcile'), id }),
  z.object({ action: z.literal('outbox-retry-failed'), id }),
  z.object({ action: z.literal('invoice-prepare'), id }),
  z.object({ action: z.literal('demo-seed'), key: z.string().min(1).max(60).optional() }),
]);
/** Executes a schema-validated command. Caller must have passed operator bearer authorization. */
export async function operatorAction(runtime: Runtime, raw: unknown): Promise<unknown> {
  const input = ActionSchema.parse(raw);
  const actor = 'operator';
  switch (input.action) {
    case 'customer-update':
      return runtime.store.transaction(() => {
        const updated = runtime.store.update('customers', input.id, input.revision, input.data);
        runtime.store.audit(actor, 'customer.billing_updated', input.id);
        return updated;
      });
    case 'consultation-complete':
      runtime.booking.completeConsultation(input.id, input.revision, actor);
      return { completed: true };
    case 'quote-approve':
      return runtime.booking.approveAgreedQuote({ ...input, actor });
    case 'show-confirm':
      if (!runtime.config.BOOKING_WRITES_ENABLED) throw new Error('Booking writes are disabled.');
      return runtime.booking.confirmShow({ ...input, actor });
    case 'show-cancel':
      return runtime.booking.cancelShow(input.id, input.revision, actor);
    case 'show-reschedule':
      if (!runtime.config.BOOKING_WRITES_ENABLED) throw new Error('Booking writes are disabled.');
      return runtime.booking.rescheduleShow({ ...input, actor });
    case 'holds-expire':
      return runtime.booking.expireHolds();
    case 'morning':
      if (!runtime.config.MORNING_SCAN_ENABLED) throw new Error('Morning scan is disabled.');
      return runMorningJob(runtime.store, runtime.billing, {
        asOfLocalDate: input.asOfLocalDate,
        force: input.force,
      });
    case 'replies-poll':
      return runImapReplyJob(runtime.store, runtime.imap, runtime.billing);
    case 'outbox-dispatch':
      return runtime.outbox.dispatchPending();
    case 'outbox-reconcile':
      return runtime.outbox.reconcileUncertain(input.id);
    case 'outbox-retry-failed':
      return runtime.outbox.retryFailed(input.id);
    case 'invoice-prepare':
      return runtime.billing.prepareInvoiceDelivery(input.id);
    case 'demo-seed':
      return seedDemo(runtime, input.key);
  }
}
