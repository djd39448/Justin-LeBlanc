/** Proves round-two HTTP, budget, private-brief, quote, and invoice boundaries. */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../apps/api/app.js';
import { EventBriefService } from '../apps/api/billing/brief.js';
import { BillingService, type CalendarShowEvent } from '../apps/api/billing/service.js';
import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';
import { Store } from '../apps/api/store.js';
import {
  InquiryInputSchema,
  MAX_BUDGET_CENTS,
  QuoteSchema,
  ShowSchema,
  type InquiryInput,
  type Quote,
  type Show,
} from '../packages/contracts/index.js';
import { InvoiceSchema } from '../packages/domain/billing.js';

const runtimes: Runtime[] = [];
const stores: Store[] = [];

afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.store.close();
  for (const store of stores.splice(0)) store.close();
});

const intake = {
  name: 'Synthetic Host',
  email: 'client@example.com',
  preferredReply: 'email',
  eventType: 'private',
  date: '2026-11-14',
  city: 'Houston',
  durationMinutes: 120,
  atmosphere: 'Relaxed acoustic music',
  consent: true,
  source: 'form',
};

function apiFixture(): { app: ReturnType<typeof createApp> } {
  const runtime = createRuntime(
    ConfigSchema.parse({
      ADMIN_TOKEN: 'a'.repeat(40),
      JOB_AUTH_SECRET: 'j'.repeat(40),
      DEMO_RECIPIENT_ALLOWLIST: 'client@example.com,operator@example.com',
      OPERATOR_EMAIL: 'operator@example.com',
      PERFORMER_EMAIL: 'operator@example.com',
      CLIENT_TEST_EMAIL: 'client@example.com',
      OPENAI_API_KEY: 'test-only',
      DATABASE_URL: ':memory:',
      PRIVATE_STORAGE_PATH: 'private/test-documents',
    }),
  );
  runtimes.push(runtime);
  return { app: createApp(runtime) };
}

describe('round-two HTTP inquiry boundaries', () => {
  it.each(['text', 'phone'] as const)(
    'maps missing phone to phone for %s',
    async (preferredReply) => {
      const { app } = apiFixture();
      const response = await app.request('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...intake, preferredReply, phone: '   ' }),
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as { fields: { path: string }[] };
      expect(body.fields).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'phone' })]),
      );
    },
  );

  it('allows email reply preference to omit phone', async () => {
    const { app } = apiFixture();
    const response = await app.request('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intake),
    });
    expect(response.status).toBe(201);
    expect((await response.json()) as { id: string; token: string }).toEqual(
      expect.objectContaining({ id: expect.any(String), token: expect.any(String) }),
    );
  });

  it.each([
    ['malformed', '75050'],
    ['out-of-range low', -1],
    ['out-of-range high', MAX_BUDGET_CENTS + 1],
    ['non-integer', 75_050.5],
  ] as const)('rejects %s budgetCents at the API boundary', async (_label, budgetCents) => {
    const { app } = apiFixture();
    const response = await app.request('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...intake, budgetCents }),
    });
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fields: { path: string }[] };
    expect(body.fields).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'budgetCents' })]),
    );
  });
});

const privateInput = (budget: string, budgetCents: number | null): InquiryInput =>
  InquiryInputSchema.parse({
    name: 'Synthetic Client',
    email: 'client@example.test',
    phone: '',
    preferredReply: 'email',
    company: 'Synthetic Client LLC',
    eventType: 'private',
    date: '2026-09-20',
    city: 'Houston',
    venue: 'Synthetic Hall',
    address: '',
    setting: 'indoor',
    guestCount: 40,
    startLocal: '20:00',
    endLocal: '22:00',
    durationMinutes: 120,
    timezone: 'America/Chicago',
    atmosphere: 'Warm',
    musicRequests: '',
    scheduleNotes: '',
    equipment: 'unknown',
    access: 'unknown',
    budget,
    budgetCents,
    notes: '',
    consent: true,
    marketingConsent: false,
    source: 'form',
    utm: {},
  });

interface DomainFixture {
  store: Store;
  input: InquiryInput;
  show: Show;
  quote: Quote;
  event: CalendarShowEvent;
}

function domainFixture(budget: string, budgetCents: number | null): DomainFixture {
  const store = new Store(':memory:');
  stores.push(store);
  const input = privateInput(budget, budgetCents);
  const show: Show = {
    inquiryId: 'inquiry-1',
    customerId: 'customer-1',
    eventType: 'Private gathering',
    venue: 'Synthetic Hall',
    city: 'Houston',
    start: '2026-09-20T02:00:00.000Z',
    end: '2026-09-20T06:30:00.000Z',
    timezone: 'America/Chicago',
    bufferBeforeMinutes: 120,
    bufferAfterMinutes: 90,
    status: 'confirmed',
    holdExpiresAt: '2026-09-19T00:00:00.000Z',
    quoteId: 'quote-1',
    consultationId: 'consultation-1',
    synthetic: true,
  };
  const quote = QuoteSchema.parse({
    showId: show.inquiryId.replace('inquiry', 'show'),
    version: 1,
    kind: 'agreed',
    currency: 'USD',
    lines: [{ description: 'Private gathering performance', quantity: 1, unitCents: 70_000 }],
    subtotalCents: 70_000,
    taxCents: 0,
    depositCents: 0,
    totalCents: 70_000,
    policyVersion: 'test-policy',
    approvedBy: 'operator@example.test',
    approvedAt: '2026-09-01T12:00:00.000Z',
  });
  store.insert('customers', 'customer-1', {
    name: input.name,
    email: input.email,
    phone: input.phone,
    company: input.company,
    billingName: input.company,
    billingEmail: input.email,
    billingAddress: '100 Test Way\nHouston, TX 77002',
    poRequired: false,
    poNumber: '',
  });
  store.insert('inquiries', 'inquiry-1', {
    customerId: 'customer-1',
    input,
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
  store.insert('shows', 'show-1', show);
  store.insert('quotes', 'quote-1', quote);
  const event: CalendarShowEvent = {
    eventId: 'event-1',
    status: 'confirmed',
    start: { kind: 'dateTime', dateTime: show.start, timeZone: show.timezone },
    end: { kind: 'dateTime', dateTime: show.end, timeZone: show.timezone },
    recurringEventId: null,
    originalStart: null,
    etag: 'etag-1',
    metadata: {
      tenantId: 'justin-demo',
      showId: 'show-1',
      customerId: 'customer-1',
      quoteVersion: quote.version,
      currency: quote.currency,
      agreedTotalCents: quote.totalCents,
    },
  };
  return { store, input, show, quote, event };
}

function billingService(fixture: DomainFixture, storagePath: string): BillingService {
  return new BillingService(
    fixture.store,
    { listShowEvents: async () => [fixture.event] },
    {
      operatorEmail: 'operator@example.test',
      performerEmail: 'operator@example.test',
      senderEmail: 'sender@example.test',
      publicSiteUrl: 'https://example.test',
      privateStoragePath: storagePath,
      sellerDisplayName: 'Justin LeBlanc (Demo)',
      sellerAddress: 'Demo address to confirm',
      demoMode: true,
      hostname: 'example.test',
      renderPdf: async (_html, outputPath) => writeFile(outputPath, '%PDF-1.4 synthetic fixture'),
    },
  );
}

describe('round-two private money and brief boundaries', () => {
  it('keeps legacy budget ranges private and renders numeric budget cents exactly', async () => {
    const legacy = domainFixture('750–1,000', null);
    const legacyBrief = new EventBriefService(legacy.store, {
      operatorEmail: 'operator@example.test',
      senderEmail: 'sender@example.test',
      publicSiteUrl: 'https://example.test',
      privateStoragePath: '/tmp',
      hostname: 'example.test',
    });
    const legacyRendered = await legacyBrief.preview('show-1');
    expect(legacyRendered.text).toContain('Legacy budget context: 750–1,000');
    expect(legacyRendered.text).not.toContain('Estimated budget supplied by client');

    const numeric = domainFixture('unsure', 75_050);
    const numericBrief = new EventBriefService(numeric.store, {
      operatorEmail: 'operator@example.test',
      senderEmail: 'sender@example.test',
      publicSiteUrl: 'https://example.test',
      privateStoragePath: '/tmp',
      hostname: 'example.test',
    });
    const numericRendered = await numericBrief.preview('show-1');
    expect(numericRendered.text).toContain('Estimated budget supplied by client: $750.50 USD');
    expect(numericRendered.text).not.toContain('75050');
  });

  it('does not use either budget representation to calculate quote or invoice totals', async () => {
    const storage = await mkdtemp(join(tmpdir(), 'jlm-round-two-boundaries-'));
    const variants = [
      domainFixture('unsure', null),
      domainFixture('750–1,000', null),
      domainFixture('unsure', 75_050),
    ];
    for (const fixture of variants) {
      expect(fixture.quote.totalCents).toBe(70_000);
      const service = billingService(fixture, storage);
      const result = await service.runMorningCheck({
        now: new Date('2026-09-21T14:00:00Z'),
        force: true,
      });
      expect(result.queued).toBe(1);
      const invoice = fixture.store.all('invoices', InvoiceSchema)[0];
      expect(invoice?.data.snapshot.quote.totalCents).toBe(70_000);
      expect(fixture.store.get('shows', 'show-1', ShowSchema).data.status).toBe('performed');
    }
  });
});
