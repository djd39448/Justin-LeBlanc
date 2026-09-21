/** Tests shared document content and privacy boundaries. Dependencies: Vitest/templates. */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MailEffectSchema } from '../apps/api/adapters/email.js';
import { EventBriefService } from '../apps/api/billing/brief.js';
import { Store } from '../apps/api/store.js';
import { renderEventBrief, renderInvoice } from '../packages/documents/index.js';
import { InvoiceSchema } from '../packages/domain/billing.js';

describe('document templates', () => {
  it('escapes intake content and labels unknown brief fields', () => {
    const rendered = renderEventBrief({
      showId: 'show-1',
      revision: 2,
      status: 'Tentative',
      eventType: 'Private <script>alert(1)</script>',
      eventDate: 'September 20, 2026',
      performanceTime: '7:00 PM-9:00 PM',
      timezone: 'America/Chicago',
      venue: 'To confirm',
      city: 'Houston',
      guestCount: 'To confirm',
      priceLabel: 'Estimate',
      price: '$700.00 USD',
      client: [{ label: 'Host', value: 'Synthetic Client' }],
      schedule: [{ label: 'Load-in', value: 'To confirm' }],
      music: [{ label: 'Atmosphere', value: 'Warm' }],
      venueDetails: [{ label: 'Power', value: 'To confirm' }],
      commercial: [{ label: 'Quote', value: 'Demo v1' }],
      questions: ['Confirm PA access'],
      lastUpdated: '2026-09-21 08:00 CDT',
      nextAction: 'Complete consultation',
      operatorUrl: 'https://example.test/admin/shows/show-1',
    });
    expect(rendered.html).not.toContain('<script>');
    expect(rendered.html).toContain('&lt;script&gt;');
    expect(rendered.text).toContain('To confirm');
  });

  it('renders currency, demo disclosure, and no BCC identity from an invoice snapshot', () => {
    const invoice = InvoiceSchema.parse({
      showId: 'show-1',
      number: 'JLM-DEMO-2026-0001',
      kind: 'performance',
      status: 'approved',
      snapshot: {
        customer: {
          name: 'Synthetic Client',
          email: 'client@example.test',
          company: 'Example Co',
          billingName: 'Example Co',
          billingEmail: 'client@example.test',
          billingAddress: '100 Test Way\nHouston, TX',
          poRequired: false,
          poNumber: '',
        },
        seller: {
          displayName: 'Justin LeBlanc (Demo)',
          address: 'Address to confirm',
          replyEmail: 'sender@example.test',
          demoDisclosure: 'Demo invoice using provisional terms. Not a payment request.',
        },
        event: {
          showId: 'show-1',
          eventType: 'Corporate reception',
          venue: 'Synthetic Hall',
          city: 'Houston',
          start: '2026-09-20T23:00:00.000Z',
          end: '2026-09-21T01:00:00.000Z',
          timezone: 'America/Chicago',
        },
        quote: {
          version: 1,
          currency: 'USD',
          lines: [{ description: 'Performance', quantity: 1, unitCents: 90_000 }],
          subtotalCents: 90_000,
          taxCents: 0,
          depositCents: 10_000,
          totalCents: 80_000,
          policyVersion: 'demo',
        },
        issuedAt: '2026-09-21T15:00:00.000Z',
        dueDate: '2026-10-05',
      },
      snapshotHash: 'a'.repeat(64),
      pdfKey: '',
      contentHash: null,
      outboundMessageId: '<invoice@example.test>',
      providerMessageId: null,
      sentAt: null,
    });
    const rendered = renderInvoice(invoice);
    expect(rendered.html).toContain('DEMO - NOT A PAYMENT REQUEST');
    expect(rendered.html).toContain('$800.00 USD');
    expect(rendered.text).toContain('Deposit credited: $100.00 USD');
    expect(rendered.html).not.toContain('operator@example.test');
  });

  it('queues an operator-only brief email only after its PDF exists', async () => {
    const store = new Store(':memory:');
    try {
      store.insert('customers', 'customer-1', {
        name: 'Synthetic Client',
        email: 'client@example.test',
        phone: '',
        company: 'Synthetic Co',
        billingName: '',
        billingEmail: '',
        billingAddress: '',
        poRequired: false,
        poNumber: '',
      });
      store.insert('inquiries', 'inquiry-1', {
        customerId: 'customer-1',
        input: {
          name: 'Synthetic Client',
          email: 'client@example.test',
          phone: '',
          preferredReply: 'email',
          company: 'Synthetic Co',
          eventType: 'private',
          date: '2026-09-19',
          city: 'Houston',
          venue: '',
          address: '',
          setting: 'unknown',
          guestCount: null,
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
          consent: true,
          marketingConsent: false,
          source: 'form',
          utm: {},
        },
        status: 'consultation_scheduled',
        tokenHash: 'synthetic-token-hash',
        followupQuestions: ['Confirm load-in route'],
      });
      store.insert('consultations', 'consultation-1', {
        inquiryId: 'inquiry-1',
        showId: 'show-1',
        start: '2026-09-01T14:00:00.000Z',
        end: '2026-09-01T14:20:00.000Z',
        timezone: 'America/New_York',
        status: 'scheduled',
      });
      store.insert('shows', 'show-1', {
        inquiryId: 'inquiry-1',
        customerId: 'customer-1',
        eventType: 'Private gathering',
        venue: '',
        city: 'Houston',
        start: '2026-09-20T00:00:00.000Z',
        end: '2026-09-20T02:00:00.000Z',
        timezone: 'America/Chicago',
        bufferBeforeMinutes: 120,
        bufferAfterMinutes: 90,
        status: 'tentative',
        holdExpiresAt: '2026-09-03T14:20:00.000Z',
        quoteId: null,
        consultationId: 'consultation-1',
        synthetic: true,
      });
      const storage = await mkdtemp(join(tmpdir(), 'jlm-brief-'));
      const service = new EventBriefService(store, {
        operatorEmail: 'operator@example.test',
        senderEmail: 'sender@example.test',
        publicSiteUrl: 'https://example.test',
        privateStoragePath: storage,
        hostname: 'example.test',
        renderPdf: async (_html, outputPath) => writeFile(outputPath, '%PDF synthetic brief'),
      });
      const preview = await service.preview('show-1');
      expect(preview.pdfPath).toBeNull();
      expect(preview.html).toContain('/admin?show=show-1');
      expect(store.effects()).toHaveLength(0);
      const prepared = await service.prepare({ version: 1, showId: 'show-1' });
      const effect = store
        .effects('pending')
        .find((candidate) => candidate.kind === 'email.event_brief');
      expect(effect).toBeDefined();
      const mail = MailEffectSchema.parse(JSON.parse(effect?.payload ?? '{}'));
      expect(mail.to).toEqual(['operator@example.test']);
      expect(mail.attachments[0]?.path).toBe(prepared.pdfPath);
      expect(prepared.pdfPath).toMatch(/event-brief-show-1-r1\.pdf$/);
      expect(mail.attachments[0]?.filename).toBe('event-brief-show-1-r1.pdf');
      expect(mail.text).toContain('To confirm');
    } finally {
      store.close();
    }
  });
});
