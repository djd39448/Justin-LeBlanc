import { describe, expect, it } from 'vitest';

import { MailEffectSchema } from '../apps/api/adapters/email.js';
import { assertInquiryNotificationRecipients, ConfigSchema } from '../apps/api/config.js';
import { markInquiryFollowedUp, runInquiryFollowups } from '../apps/api/jobs/inquiry-followups.js';
import { Store } from '../apps/api/store.js';
import { CustomerSchema, InquiryInputSchema, InquirySchema } from '../packages/contracts/index.js';
import { BookingService } from '../packages/domain/booking.js';

const base = {
  name: 'Synthetic Host',
  email: 'client@example.test',
  phone: '',
  preferredReply: 'email' as const,
  company: 'Legacy Company',
  eventType: 'private' as const,
  date: '2026-11-14',
  city: 'Houston',
  venue: 'Legacy Venue',
  address: 'Legacy Address',
  setting: 'indoor' as const,
  guestCount: 80,
  startLocal: '19:00',
  endLocal: '21:00',
  durationMinutes: 120,
  timezone: 'America/Chicago',
  atmosphere: 'Warm',
  musicRequests: 'Legacy requests',
  scheduleNotes: 'Legacy schedule',
  equipment: 'Legacy PA',
  access: 'Legacy access',
  budget: '750–1,000',
  budgetCents: null,
  notes: 'Legacy notes',
  consent: true as const,
  marketingConsent: false,
  source: 'form' as const,
  utm: { source: 'legacy', medium: 'email', campaign: 'old' },
};
const intake = (phone = '', preferredReply: 'email' | 'text' | 'phone' = 'email') =>
  InquiryInputSchema.parse({ ...base, phone, preferredReply });
const config = (enabled: boolean) =>
  ConfigSchema.parse({
    NODE_ENV: 'test',
    ADMIN_TOKEN: 'a'.repeat(40),
    JOB_AUTH_SECRET: 'j'.repeat(40),
    DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test',
    OPERATOR_EMAIL: 'operator@example.test',
    PERFORMER_EMAIL: 'operator@example.test',
    CLIENT_TEST_EMAIL: 'client@example.test',
    INQUIRY_NOTIFICATIONS_ENABLED: String(enabled),
    INQUIRY_NOTIFICATION_EMAIL: 'justin@example.test',
  });
const makeService = (store: Store, enabled: boolean) =>
  new BookingService(
    store,
    { busy: async () => [] },
    { operatorEmail: 'operator@example.test', performerEmail: 'operator@example.test' },
    undefined,
    {
      enabled,
      recipient: 'justin@example.test',
      sender: 'operator@example.test',
      replyTo: 'operator@example.test',
      hostname: 'example.test',
    },
  );

describe('round-three inquiry backend', () => {
  it('reads legacy invalid phones and absent follow-up state', () => {
    const store = new Store(':memory:');
    store.insert('customers', 'c', {
      name: 'Legacy',
      email: 'legacy@example.test',
      phone: 'old ext',
      company: 'Old',
      billingName: '',
      billingEmail: '',
      billingAddress: '',
      poRequired: false,
      poNumber: '',
    });
    store.insert('inquiries', 'i', {
      customerId: 'c',
      input: { ...base, phone: '555-LEGACY-ext4' },
      status: 'new',
      tokenHash: 'hash',
      followupQuestions: [],
    });
    const row = store.get('inquiries', 'i', InquirySchema);
    expect(row.data.input.phone).toBe('555-LEGACY-ext4');
    expect(row.data.followUp).toBeUndefined();
    store.close();
  });

  it('keeps historical inquiries unenrolled when the follow-up job runs', async () => {
    const store = new Store(':memory:');
    store.insert('inquiries', 'historical', {
      customerId: 'legacy-customer',
      input: { ...base, phone: '555-LEGACY-ext4' },
      status: 'new',
      tokenHash: 'hash',
      followupQuestions: [],
    });
    const result = await runInquiryFollowups(
      store,
      config(true),
      new Date('2030-01-01T00:00:00.000Z'),
    );
    expect(result).toMatchObject({ inspected: 1, skipped: 1, dueSoon: 0, overdue: 0 });
    expect(store.effects()).toHaveLength(0);
    expect(store.get('inquiries', 'historical', InquirySchema).data.followUp).toBeUndefined();
    store.close();
  });

  it('enforces strict phone edge cases with one browser/API message', () => {
    expect(intake('', 'text').phone).toBe('');
    for (const phone of ['5555550100', '15555550100', '+1 555 555 0100', '(555) 555-0100'])
      expect(InquiryInputSchema.safeParse({ ...intake(), phone }).success).toBe(true);
    for (const phone of [
      '+1 555 555 010',
      '555555010',
      '155555501000',
      '555-ABC-0100',
      '5555550100x2',
      'x'.repeat(31),
    ]) {
      const result = InquiryInputSchema.safeParse({ ...intake(), phone });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(
          result.error.issues.some(
            (issue) =>
              issue.message === 'Enter a complete 10-digit phone number or clear this field.',
          ),
        ).toBe(true);
    }
  });

  it('preserves omitted retired fields/company on partial resume and idempotent create', () => {
    const store = new Store(':memory:');
    const booking = makeService(store, true);
    const key = 'a'.repeat(43);
    const first = booking.upsertInquiry({ input: intake('', 'text'), idempotencyKey: key });
    booking.upsertInquiry({
      input: intake('', 'text'),
      inquiryId: first.inquiryId,
      resumeToken: first.resumeToken,
      providedFields: new Set([
        'name',
        'email',
        'preferredReply',
        'eventType',
        'date',
        'city',
        'durationMinutes',
        'consent',
      ]),
    });
    const row = store.get('inquiries', first.inquiryId, InquirySchema);
    const customer = store.get('customers', row.data.customerId, CustomerSchema);
    expect(row.data.input.venue).toBe('Legacy Venue');
    expect(row.data.input.utm.source).toBe('legacy');
    expect(customer.data.company).toBe('Legacy Company');
    expect(booking.upsertInquiry({ input: intake('', 'text'), idempotencyKey: key })).toEqual({
      inquiryId: first.inquiryId,
      resumeToken: key,
      status: 'new',
    });
    expect(
      store.effects().filter((effect) => effect.kind === 'email.inquiry_received'),
    ).toHaveLength(1);
    const effect = store.effects()[0];
    if (!effect) throw new Error('missing initial effect');
    const mail = MailEffectSchema.parse(JSON.parse(effect.payload));
    expect(mail.text).toContain('Email fallback');
    expect(mail.text).toContain('Follow-up deadline:');
    expect(mail.text).not.toContain(key);
    expect(() =>
      booking.upsertInquiry({ input: intake('5555550100'), idempotencyKey: key }),
    ).toThrow('different inquiry payload');
    store.close();
  });

  it('recovers disabled alerts, fires thresholds once, and skips historical records', async () => {
    const store = new Store(':memory:');
    const first = makeService(store, false).upsertInquiry({ input: intake() });
    const row = store.get('inquiries', first.inquiryId, InquirySchema);
    if (!row.data.followUp) throw new Error('missing state');
    const t24 = new Date(Date.parse(row.data.followUp.receivedAt) + 24 * 60 * 60_000);
    await runInquiryFollowups(store, config(false), t24);
    expect(store.effects()).toHaveLength(0);
    expect(store.get('inquiries', first.inquiryId, InquirySchema).data.followUp).toMatchObject({
      initialAlertQueuedAt: null,
      reminder20QueuedAt: null,
      overdue24QueuedAt: null,
    });
    await runInquiryFollowups(store, config(true), t24);
    await runInquiryFollowups(store, config(true), t24);
    expect(store.effects().filter((e) => e.kind.startsWith('email.inquiry_'))).toHaveLength(3);
    store.close();
  });

  it('completion before 20h suppresses alerts and preserves timestamp on replay', async () => {
    const store = new Store(':memory:');
    const first = makeService(store, true).upsertInquiry({ input: intake() });
    let row = store.get('inquiries', first.inquiryId, InquirySchema);
    if (!row.data.followUp) throw new Error('missing state');
    const completed = markInquiryFollowedUp(store, first.inquiryId, row.revision, 'justin');
    const at = (completed as typeof row).data.followUp?.followedUpAt;
    row = store.get('inquiries', first.inquiryId, InquirySchema);
    if (!row.data.followUp) throw new Error('missing state');
    expect(markInquiryFollowedUp(store, first.inquiryId, row.revision, 'justin')).toEqual(row);
    await runInquiryFollowups(
      store,
      config(true),
      new Date(Date.parse(row.data.followUp.receivedAt) + 24 * 60 * 60_000),
    );
    expect(store.effects().filter((e) => e.kind !== 'email.inquiry_received')).toHaveLength(0);
    expect(store.get('inquiries', first.inquiryId, InquirySchema).data.followUp?.followedUpAt).toBe(
      at,
    );
    store.close();
  });

  it('completion between 20h and 24h suppresses only overdue', async () => {
    const store = new Store(':memory:');
    const first = makeService(store, true).upsertInquiry({ input: intake() });
    let row = store.get('inquiries', first.inquiryId, InquirySchema);
    if (!row.data.followUp) throw new Error('missing state');
    const t20 = new Date(Date.parse(row.data.followUp.receivedAt) + 20 * 60 * 60_000);
    await runInquiryFollowups(store, config(true), t20);
    row = store.get('inquiries', first.inquiryId, InquirySchema);
    markInquiryFollowedUp(store, first.inquiryId, row.revision, 'justin');
    await runInquiryFollowups(store, config(true), new Date(t20.getTime() + 3 * 60 * 60_000));
    expect(store.effects().filter((e) => e.kind === 'email.inquiry_due_soon')).toHaveLength(1);
    expect(store.effects().filter((e) => e.kind === 'email.inquiry_overdue')).toHaveLength(0);
    store.close();
  });

  it('enforces dedicated recipient policy and keeps unrelated mail isolated', () => {
    const good = { to: ['justin@example.test'], cc: [], bcc: [] };
    expect(() => assertInquiryNotificationRecipients(config(true), good)).not.toThrow();
    for (const mail of [
      { to: ['other@example.test'], cc: [], bcc: [] },
      { to: ['justin@example.test', 'other@example.test'], cc: [], bcc: [] },
      { to: good.to, cc: ['other@example.test'], bcc: [] },
      { to: good.to, cc: [], bcc: ['other@example.test'] },
    ])
      expect(() => assertInquiryNotificationRecipients(config(true), mail)).toThrow();
    expect(() =>
      assertInquiryNotificationRecipients({ ...config(true), DEMO_MODE: false }, good),
    ).toThrow();
  });
});
