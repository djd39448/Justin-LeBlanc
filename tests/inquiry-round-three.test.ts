import { describe, expect, it } from 'vitest';

import { ConfigSchema } from '../apps/api/config.js';
import { runInquiryFollowups } from '../apps/api/jobs/inquiry-followups.js';
import { Store } from '../apps/api/store.js';
import { InquiryInputSchema } from '../packages/contracts/index.js';
import { BookingService } from '../packages/domain/booking.js';

const input = (phone = '', preferredReply: 'email' | 'text' | 'phone' = 'email') => InquiryInputSchema.parse({
  name: 'Synthetic Host', email: 'client@example.test', phone, preferredReply,
  eventType: 'private', date: '2026-11-14', city: 'Houston', durationMinutes: 120,
  setting: 'indoor', atmosphere: 'Warm', consent: true, source: 'form',
});

const config = (enabled: boolean) => ConfigSchema.parse({
  NODE_ENV: 'test', ADMIN_TOKEN: 'a'.repeat(40), JOB_AUTH_SECRET: 'j'.repeat(40),
  DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test', OPERATOR_EMAIL: 'operator@example.test',
  PERFORMER_EMAIL: 'operator@example.test', CLIENT_TEST_EMAIL: 'client@example.test',
  INQUIRY_NOTIFICATIONS_ENABLED: String(enabled), INQUIRY_NOTIFICATION_EMAIL: 'justin@example.test',
});

describe('round-three inquiry backend', () => {
  it('accepts blank phones and enforces the compact US matrix', () => {
    expect(input('', 'text').phone).toBe('');
    for (const phone of ['5555550100', '15555550100', '+1 555 555 0100', '(555) 555-0100'])
      expect(InquiryInputSchema.safeParse({ ...input(), phone }).success).toBe(true);
    for (const phone of ['+1 555 555 010', '555555010', '155555501000', '555-ABC-0100', '5555550100x2']) {
      const result = InquiryInputSchema.safeParse({ ...input(), phone });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some((issue) => issue.message === 'Enter a complete 10-digit phone number or clear this field.')).toBe(true);
    }
  });

  it('queues one initial alert and replays the same idempotent create', () => {
    const store = new Store(':memory:');
    const service = new BookingService(store, { busy: async () => [] }, { operatorEmail: 'operator@example.test', performerEmail: 'operator@example.test' }, undefined, {
      enabled: true, recipient: 'justin@example.test', sender: 'operator@example.test', replyTo: 'operator@example.test', hostname: 'example.test',
    });
    const key = 'a'.repeat(43);
    const first = service.upsertInquiry({ input: input(), idempotencyKey: key });
    const replay = service.upsertInquiry({ input: input(), idempotencyKey: key });
    expect(replay).toEqual(first);
    expect(store.effects().filter((effect) => effect.kind === 'email.inquiry_received')).toHaveLength(1);
    expect(() => service.upsertInquiry({ input: input('5555550100'), idempotencyKey: key })).toThrow('different inquiry payload');
    store.close();
  });

  it('recovers disabled initial mail and runs exact-once 20/24-hour alerts', async () => {
    const store = new Store(':memory:');
    const service = new BookingService(store, { busy: async () => [] }, { operatorEmail: 'operator@example.test', performerEmail: 'operator@example.test' }, undefined, {
      enabled: false, recipient: 'justin@example.test', sender: 'operator@example.test', replyTo: 'operator@example.test', hostname: 'example.test',
    });
    const receipt = service.upsertInquiry({ input: input() });
    const row = store.get('inquiries', receipt.inquiryId, (await import('../packages/contracts/index.js')).InquirySchema);
    const now = new Date(Date.parse(row.data.followUp!.receivedAt) + 24 * 60 * 60_000);
    await runInquiryFollowups(store, config(true), now);
    await runInquiryFollowups(store, config(true), now);
    expect(store.effects().filter((effect) => effect.kind.startsWith('email.inquiry_'))).toHaveLength(3);
    store.close();
  });
});

