/** Verifies round-two inquiry compatibility and private budget context rendering. */
import { describe, expect, it } from 'vitest';

import { EventBriefService } from '../apps/api/billing/brief.js';
import { Store } from '../apps/api/store.js';
import { InquiryInputSchema, MAX_BUDGET_CENTS } from '../packages/contracts/index.js';

const baseInput = {
  name: 'Synthetic Client',
  email: 'client@example.test',
  phone: '',
  preferredReply: 'email' as const,
  company: '',
  eventType: 'private' as const,
  date: '2026-11-14',
  city: 'Houston',
  venue: 'Synthetic Hall',
  address: '',
  setting: 'indoor' as const,
  guestCount: 40,
  startLocal: '19:00',
  endLocal: '21:00',
  durationMinutes: 120,
  timezone: 'America/Chicago',
  atmosphere: 'Warm',
  musicRequests: '',
  scheduleNotes: '',
  equipment: 'unknown',
  access: 'unknown',
  budget: 'unsure',
  notes: '',
  consent: true as const,
  marketingConsent: false,
  source: 'form' as const,
  utm: {},
};

describe('round-two inquiry contract', () => {
  it('defaults additive budget cents to null and keeps legacy budget strings readable', () => {
    const parsed = InquiryInputSchema.parse({ ...baseInput, budget: '750–1,000' });
    expect(parsed.budget).toBe('750–1,000');
    expect(parsed.budgetCents).toBeNull();
    expect(
      InquiryInputSchema.parse({ ...baseInput, budgetCents: MAX_BUDGET_CENTS }).budgetCents,
    ).toBe(MAX_BUDGET_CENTS);
  });

  it.each(['text', 'phone'] as const)(
    'accepts blank phone for %s preference',
    (preferredReply) => {
      const result = InquiryInputSchema.safeParse({ ...baseInput, phone: '  ', preferredReply });
      expect(result.success).toBe(true);
    },
  );

  it('accepts text with a phone number and rejects invalid budget cents', () => {
    const parsed = InquiryInputSchema.parse({
      ...baseInput,
      phone: '+1 555 555 0100',
      preferredReply: 'text',
      budgetCents: 75_050,
    });
    expect(parsed.preferredReply).toBe('text');
    expect(parsed.budgetCents).toBe(75_050);
    for (const budgetCents of [-1, 1.5, MAX_BUDGET_CENTS + 1]) {
      expect(InquiryInputSchema.safeParse({ ...baseInput, budgetCents }).success).toBe(false);
    }
  });
});

describe('private event brief budget context', () => {
  it('formats supplied cents naturally and leaves quote pricing independent', async () => {
    const store = new Store(':memory:');
    try {
      store.insert('customers', 'customer-1', {
        name: baseInput.name,
        email: baseInput.email,
        phone: baseInput.phone,
        company: baseInput.company,
        billingName: '',
        billingEmail: '',
        billingAddress: '',
        poRequired: false,
        poNumber: '',
      });
      store.insert('inquiries', 'inquiry-1', {
        customerId: 'customer-1',
        input: InquiryInputSchema.parse({ ...baseInput, budgetCents: 75_050 }),
        status: 'consultation_scheduled',
        tokenHash: 'synthetic-token-hash',
        followupQuestions: [],
      });
      store.insert('consultations', 'consultation-1', {
        inquiryId: 'inquiry-1',
        showId: 'show-1',
        start: '2026-09-01T14:00:00.000Z',
        end: '2026-09-01T14:20:00.000Z',
        timezone: 'America/Chicago',
        status: 'scheduled',
      });
      store.insert('shows', 'show-1', {
        inquiryId: 'inquiry-1',
        customerId: 'customer-1',
        eventType: 'Private gathering',
        venue: 'Synthetic Hall',
        city: 'Houston',
        start: '2026-11-15T01:00:00.000Z',
        end: '2026-11-15T03:00:00.000Z',
        timezone: 'America/Chicago',
        bufferBeforeMinutes: 120,
        bufferAfterMinutes: 90,
        status: 'tentative',
        holdExpiresAt: '2026-09-03T14:20:00.000Z',
        quoteId: null,
        consultationId: 'consultation-1',
        synthetic: true,
      });

      const service = new EventBriefService(store, {
        operatorEmail: 'operator@example.test',
        senderEmail: 'sender@example.test',
        publicSiteUrl: 'https://example.test',
        privateStoragePath: '/tmp',
        hostname: 'example.test',
      });
      const rendered = await service.preview('show-1');
      expect(rendered.text).toContain('Estimated budget supplied by client: $750.50 USD');
      expect(rendered.text).toContain('Estimate: To confirm');
      expect(rendered.text).not.toContain('Estimate: $750.50 USD');
    } finally {
      store.close();
    }
  });
});
