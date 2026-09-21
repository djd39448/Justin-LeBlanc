/** Creates a tagged synthetic past show for the same real morning workflow.
 * Dependencies: contracts, Runtime and crypto. Consumers: authenticated demo controls.
 * Why: rehearsal must not require editing real calendar history or weakening booking rules. */
import { randomUUID } from 'node:crypto';

import {
  CustomerSchema,
  InquiryInputSchema,
  InquirySchema,
  POLICY_VERSION,
  QuoteSchema,
  ShowSchema,
} from '../../packages/contracts/index.js';
import { localDateForInstant, localDateTimeToInstant } from '../../packages/domain/time.js';

import type { Runtime } from './runtime.js';

/** Seeds once per supplied key and enqueues a real isolated performance event with demo metadata. */
export function seedDemo(runtime: Runtime, key = 'rehearsal-v1') {
  if (!runtime.config.DEMO_MODE) throw new Error('Synthetic seeding requires DEMO_MODE=true.');
  const showId = `jlm-demo-${key.replace(/[^a-z0-9-]/gi, '').slice(0, 60)}`;
  const lease = `demo:seed:${showId}`;
  const owner = randomUUID();
  if (!runtime.store.acquireLease(lease, owner, 30_000))
    throw new Error(
      'This demo seed is already running; inspect its existing result before retrying.',
    );
  try {
    return seedOnce(runtime, showId);
  } finally {
    runtime.store.releaseLease(lease, owner);
  }
}

/** Keeps inquiry creation within the same seed lease as the canonical show and outbox writes. */
function seedOnce(runtime: Runtime, showId: string) {
  const existing = runtime.store.find('shows', showId, ShowSchema);
  if (existing) return { showId, replayed: true };
  const inquiry = runtime.booking.upsertInquiry({
    input: InquiryInputSchema.parse({
      name: 'Jordan Demo',
      email: runtime.config.CLIENT_TEST_EMAIL,
      eventType: 'private',
      date: 'flexible',
      city: 'Houston',
      durationMinutes: 120,
      atmosphere: 'Relaxed conversation and acoustic music',
      consent: true,
      source: 'operator',
    }),
  });
  const record = runtime.store.get('inquiries', inquiry.inquiryId, InquirySchema);
  const customer = runtime.store.get('customers', record.data.customerId, CustomerSchema);
  const today = localDateForInstant(new Date().toISOString(), 'America/Chicago');
  const yesterday = new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
  const end = new Date(localDateTimeToInstant(`${yesterday}T18:00`, 'America/Chicago'));
  const start = new Date(end.getTime() - 120 * 60000).toISOString();
  const consultId = randomUUID();
  const quoteId = randomUUID();
  return runtime.store.transaction(() => {
    runtime.store.update(
      'customers',
      customer.id,
      customer.revision,
      CustomerSchema.parse({
        ...customer.data,
        billingName: 'Synthetic Demo Events',
        billingEmail: runtime.config.CLIENT_TEST_EMAIL,
        billingAddress: '100 Example Lane, Houston, TX 77002 — synthetic fixture',
      }),
    );
    runtime.store.insert('consultations', consultId, {
      inquiryId: inquiry.inquiryId,
      showId,
      start: new Date(end.getTime() - 7 * 86400000).toISOString(),
      end: new Date(end.getTime() - 7 * 86400000 + 20 * 60000).toISOString(),
      timezone: 'America/Chicago',
      status: 'completed',
    });
    runtime.store.insert(
      'quotes',
      quoteId,
      QuoteSchema.parse({
        showId,
        version: 1,
        kind: 'agreed',
        currency: 'USD',
        lines: [
          { description: 'Private gathering — demo agreed fee', quantity: 1, unitCents: 70000 },
        ],
        subtotalCents: 70000,
        taxCents: 0,
        depositCents: 0,
        totalCents: 70000,
        policyVersion: POLICY_VERSION,
        approvedBy: 'operator:demo-seed',
        approvedAt: new Date().toISOString(),
      }),
    );
    runtime.store.insert(
      'shows',
      showId,
      ShowSchema.parse({
        inquiryId: inquiry.inquiryId,
        customerId: customer.id,
        eventType: 'private',
        venue: 'Example Hall — synthetic',
        city: 'Houston',
        start,
        end: end.toISOString(),
        timezone: 'America/Chicago',
        status: 'confirmed',
        holdExpiresAt: end.toISOString(),
        quoteId,
        consultationId: consultId,
        synthetic: true,
      }),
    );
    runtime.store.enqueue(`calendar:seed:${showId}`, 'calendar.upsert', showId, {
      version: 1,
      showId,
      role: 'performance',
      reason: 'synthetic_demo_seed',
    });
    runtime.store.audit('operator', 'demo.seeded', showId, { synthetic: true });
    return { showId, replayed: false, inquiryId: inquiry.inquiryId };
  });
}
