/**
 * Proves post-show billing against real in-memory SQLite transactions.
 * Dependencies: Vitest, Store, billing service/domain. Why: money/auth/idempotency need boundary tests.
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { MailEffectSchema, type ReceivedMail } from '../apps/api/adapters/email.js';
import {
  BillingService,
  localDate,
  type BillingOptions,
  type CalendarShowEvent,
  type PerformanceCalendarReader,
} from '../apps/api/billing/service.js';
import { Store } from '../apps/api/store.js';
import {
  QuoteSchema,
  ShowSchema,
  type Customer,
  type Quote,
  type Show,
} from '../packages/contracts/index.js';
import {
  InvoiceSchema,
  parsePerformanceReply,
  PerformanceCheckSchema,
} from '../packages/domain/billing.js';

const stores: Store[] = [];

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('performance reply grammar', () => {
  it('accepts only explicit played and not-played commands', () => {
    expect(parsePerformanceReply('YES')).toEqual({ kind: 'performed' });
    expect(parsePerformanceReply('NO')).toEqual({ kind: 'not_performed' });
    const nonAuthorizing = [
      "Sounds great, let's lock in the date and finalize the budget as discussed.",
      "That works for me; I'll send over the deposit to secure our slot immediately.",
      'Perfect, we are all set to proceed with the arrangements you outlined.',
      'Agreed, please go ahead and prepare the contract based on our conversation.',
    ];
    for (const reply of nonAuthorizing) expect(parsePerformanceReply(reply).kind).toBe('ambiguous');
  });

  it('rebuilds itemized changes from a bounded exact grammar', () => {
    expect(parsePerformanceReply('YES\nADD | Overtime | 1 | $175.00')).toEqual({
      kind: 'changed',
      lines: [
        { description: 'Overtime', quantity: 1, unitCents: 17_500, source: 'performer_reply' },
      ],
    });
    expect(parsePerformanceReply('YES\nOvertime $175').kind).toBe('ambiguous');
  });
});

describe('billing service', () => {
  it('selects a show by Houston end date and issues one immutable invoice from an authenticated YES', async () => {
    const fixture = await createFixture();
    const morning = await fixture.service.runMorningCheck({
      now: new Date('2026-09-21T14:00:00Z'),
      force: true,
    });
    expect(morning.queued).toBe(1);
    expect(morning.localDates).toHaveLength(7);
    const checkCount = fixture.store.all('performance_checks', PerformanceCheckSchema).length;
    const effectCount = fixture.store.effects().length;
    const replay = await fixture.service.runMorningCheck({
      now: new Date('2026-09-21T14:00:00Z'),
      force: true,
    });
    expect(replay.localDates).toHaveLength(7);
    expect(replay.queued).toBe(0);
    expect(fixture.store.all('performance_checks', PerformanceCheckSchema)).toHaveLength(
      checkCount,
    );
    expect(fixture.store.effects()).toHaveLength(effectCount);

    const check = fixture.store.all('performance_checks', PerformanceCheckSchema)[0];
    expect(check).toBeDefined();
    if (check === undefined) throw new Error('Expected a performance check.');
    const checkMail = fixture.store
      .effects('pending')
      .find((effect) => effect.kind === 'email.performance_check');
    expect(checkMail).toBeDefined();
    if (checkMail === undefined) throw new Error('Expected a performance-check email effect.');
    const payload = MailEffectSchema.parse(JSON.parse(checkMail.payload));
    const token = payload.text.match(/\[JLM-REPLY:[^\]]+\]/)?.[0];
    expect(token).toBeDefined();
    if (token === undefined) throw new Error('Expected a correlation token.');

    const inbound = reply({
      messageId: '<reply-yes@example.test>',
      inReplyTo: check.data.outboundMessageId,
      text: `YES\n\n> quoted original\n${token}`,
    });
    const issued = await fixture.service.processReply(inbound);
    expect(issued.outcome).toBe('invoice_approved');
    expect(await fixture.service.processReply(inbound)).toEqual({
      outcome: 'duplicate',
      reason: 'Provider Message-ID was already processed.',
    });

    const invoice = fixture.store.all('invoices', InvoiceSchema)[0];
    expect(invoice?.data.snapshot.quote.totalCents).toBe(70_000);
    expect(invoice?.data.snapshot.customer.billingName).toBe('Synthetic Client LLC');
    expect(invoice?.data.status).toBe('issuing');
    const invoiceEffects = fixture.store
      .effects('pending')
      .filter((effect) => effect.kind === 'email.invoice');
    expect(invoiceEffects).toHaveLength(1);
    const invoiceMail = MailEffectSchema.parse(JSON.parse(invoiceEffects[0]?.payload ?? '{}'));
    expect(invoiceMail.to).toEqual(['client@example.test']);
    expect(invoiceMail.bcc).toEqual(['operator@example.test']);
    expect(invoiceMail.html).not.toContain('operator@example.test');
  });

  it('finds a show added after a completed date scan only on an explicit forced rescan', async () => {
    const fixture = await createFixture();
    const now = new Date('2026-09-21T14:00:00Z');
    await fixture.service.runMorningCheck({ now, force: false });

    const lateShow: Show = {
      ...fixture.show,
      inquiryId: 'inquiry-2',
      quoteId: 'quote-2',
      status: 'confirmed',
    };
    const lateQuote = QuoteSchema.parse({
      ...fixture.quote,
      showId: 'show-2',
    });
    const metadata = fixture.event.metadata;
    if (metadata === null) throw new Error('Expected synthetic calendar metadata.');
    fixture.store.insert('shows', 'show-2', lateShow);
    fixture.store.insert('quotes', 'quote-2', lateQuote);
    fixture.events.push({
      ...fixture.event,
      eventId: 'event-2',
      metadata: {
        ...metadata,
        showId: 'show-2',
      },
    });

    expect(await fixture.service.runMorningCheck({ now, force: false })).toEqual({
      localDates: [],
      checked: 0,
      queued: 0,
      review: 0,
      skipped: 0,
    });
    expect(fixture.store.all('performance_checks', PerformanceCheckSchema)).toHaveLength(1);

    const forced = await fixture.service.runMorningCheck({ now, force: true });
    expect(forced.localDates).toHaveLength(7);
    expect(forced.queued).toBe(1);
    expect(fixture.store.all('performance_checks', PerformanceCheckSchema)).toHaveLength(2);
    expect(
      fixture.store.effects().filter((effect) => effect.kind === 'email.performance_check'),
    ).toHaveLength(2);
  });

  it('queues one reminder from definitive delivery time and accepts its authenticated reply', async () => {
    const fixture = await createFixture();
    await fixture.service.runMorningCheck({ now: new Date('2026-09-21T14:00:00Z'), force: true });
    const originalEffectId = 'mail:performance-check:show-1';
    const deliveredAt = new Date('2026-09-21T15:00:00.000Z');
    fixture.store.db
      .prepare("UPDATE outbox SET status='uncertain',updated_at=? WHERE id=? AND status='pending'")
      .run(deliveredAt.toISOString(), originalEffectId);

    expect(
      fixture.service.runFollowups({
        now: new Date(deliveredAt.getTime() + 80 * 3_600_000),
      }),
    ).toEqual({ examined: 0, reminded: 0, escalated: 0, skipped: 0 });
    expect(
      fixture.store.effects().find((effect) => effect.id.includes('reminder')),
    ).toBeUndefined();

    fixture.store.db
      .prepare(
        "UPDATE outbox SET status='accepted',provider_id=?,updated_at=? WHERE id=? AND status='uncertain'",
      )
      .run('<provider-original@example.test>', deliveredAt.toISOString(), originalEffectId);
    expect(
      fixture.service.runFollowups({
        now: new Date(deliveredAt.getTime() + 23 * 3_600_000),
      }).reminded,
    ).toBe(0);
    expect(
      fixture.service.runFollowups({
        now: new Date(deliveredAt.getTime() + 25 * 3_600_000),
      }),
    ).toEqual({ examined: 1, reminded: 1, escalated: 0, skipped: 0 });

    const reminderEffect = fixture.store
      .effects('pending')
      .find((effect) => effect.id === 'mail:performance-reminder:show-1');
    if (reminderEffect === undefined) throw new Error('Expected a durable reminder effect.');
    expect(reminderEffect.kind).toBe('email.performance_reminder');
    const reminder = MailEffectSchema.parse(JSON.parse(reminderEffect.payload));
    const check = fixture.store.get('performance_checks', 'show-show-1', PerformanceCheckSchema);
    expect(reminder.messageId).toBe(check.data.reminderMessageId);
    expect(reminder.headers['In-Reply-To']).toBe(check.data.outboundMessageId);
    expect(check.data.reminderQueuedAt).toBe('2026-09-22T16:00:00.000Z');
    expect(check.data.reminderSentAt).toBeNull();
    const token = reminder.text.match(/\[JLM-REPLY:[^\]]+\]/)?.[0];
    if (token === undefined) throw new Error('Expected the verified original correlation token.');

    const reminderAcceptedAt = new Date(deliveredAt.getTime() + 26 * 3_600_000).toISOString();
    fixture.store.db
      .prepare(
        "UPDATE outbox SET status='accepted',provider_id=?,updated_at=? WHERE id=? AND status='pending'",
      )
      .run('<provider-reminder@example.test>', reminderAcceptedAt, reminderEffect.id);
    expect(
      fixture.service.runFollowups({
        now: new Date(deliveredAt.getTime() + 30 * 3_600_000),
      }).reminded,
    ).toBe(0);
    expect(
      fixture.store.get('performance_checks', 'show-show-1', PerformanceCheckSchema).data
        .reminderSentAt,
    ).toBe(reminderAcceptedAt);
    expect(
      fixture.store.effects().filter((effect) => effect.id === reminderEffect.id),
    ).toHaveLength(1);

    const result = await fixture.service.processReply(
      reply({
        messageId: '<reply-to-reminder@example.test>',
        inReplyTo: reminder.messageId,
        text: `YES\n\n> reminder quoted text\n${token}`,
        receivedAt: '2026-09-22T17:00:00.000Z',
      }),
    );
    expect(result.outcome).toBe('invoice_approved');
    expect(fixture.store.all('invoices', InvoiceSchema)).toHaveLength(1);
  });

  it('moves an unanswered delivered check to operator review after 72 hours without invoicing', async () => {
    const fixture = await createFixture();
    await fixture.service.runMorningCheck({ now: new Date('2026-09-21T14:00:00Z'), force: true });
    const deliveredAt = new Date('2026-09-21T15:00:00.000Z');
    fixture.store.db
      .prepare(
        "UPDATE outbox SET status='accepted',provider_id=?,updated_at=? WHERE id=? AND status='pending'",
      )
      .run(
        '<provider-original@example.test>',
        deliveredAt.toISOString(),
        'mail:performance-check:show-1',
      );

    expect(
      fixture.service.runFollowups({
        now: new Date(deliveredAt.getTime() + 72 * 3_600_000),
      }),
    ).toEqual({ examined: 1, reminded: 0, escalated: 1, skipped: 0 });
    expect(
      fixture.store.get('performance_checks', 'show-show-1', PerformanceCheckSchema).data.state,
    ).toBe('needs_review');
    expect(fixture.store.get('shows', 'show-1', ShowSchema).data.status).toBe('needs_review');
    expect(fixture.store.all('invoices', InvoiceSchema)).toHaveLength(0);
    expect(
      fixture.store.effects().filter((effect) => effect.id.includes('performance-reminder')),
    ).toHaveLength(0);
  });

  it('requires visible revised total approval before an amendment becomes billable', async () => {
    const fixture = await createFixture();
    await fixture.service.runMorningCheck({ now: new Date('2026-09-21T14:00:00Z'), force: true });
    const check = fixture.store.all('performance_checks', PerformanceCheckSchema)[0];
    const firstMail = fixture.store
      .effects('pending')
      .find((effect) => effect.kind === 'email.performance_check');
    if (check === undefined || firstMail === undefined)
      throw new Error('Missing morning check fixture.');
    const firstPayload = MailEffectSchema.parse(JSON.parse(firstMail.payload));
    const correlation = firstPayload.text.match(/\[JLM-REPLY:[^\]]+\]/)?.[0];
    if (correlation === undefined) throw new Error('Missing correlation token.');
    const proposed = await fixture.service.processReply(
      reply({
        messageId: '<reply-change@example.test>',
        inReplyTo: check.data.outboundMessageId,
        text: `YES\nADD | Overtime | 1 | 175.00\n\n> original\n${correlation}`,
      }),
    );
    expect(proposed.outcome).toBe('awaiting_change_approval');
    expect(fixture.store.all('invoices', InvoiceSchema)).toHaveLength(0);

    const approvalEffect = fixture.store
      .effects('pending')
      .find((effect) => effect.kind === 'email.amendment_approval');
    if (approvalEffect === undefined) throw new Error('Expected approval effect.');
    const approvalMail = MailEffectSchema.parse(JSON.parse(approvalEffect.payload));
    const command = approvalMail.text.match(/APPROVE \d+ [A-Za-z0-9_-]+/)?.[0];
    if (command === undefined) throw new Error('Expected approval command.');
    const approved = await fixture.service.processReply(
      reply({
        messageId: '<reply-approve@example.test>',
        inReplyTo: approvalMail.messageId,
        text: command,
        uid: 3,
      }),
    );
    expect(approved.outcome).toBe('invoice_approved');
    const invoice = fixture.store.all('invoices', InvoiceSchema)[0];
    expect(invoice?.data.snapshot.quote.version).toBe(2);
    expect(invoice?.data.snapshot.quote.totalCents).toBe(87_500);
    const calendarEffect = fixture.store
      .effects('pending')
      .find((effect) => effect.kind === 'calendar.upsert');
    expect(JSON.parse(calendarEffect?.payload ?? '{}')).toEqual({
      version: 1,
      showId: 'show-1',
      role: 'performance',
      reason: 'approved_invoice_amendment',
    });
  });

  it('rejects subject-only correlation, sent echoes, and unauthenticated From headers', async () => {
    const fixture = await createFixture();
    await fixture.service.runMorningCheck({ now: new Date('2026-09-21T14:00:00Z'), force: true });
    const attempts = [
      reply({
        messageId: '<bad-thread@example.test>',
        inReplyTo: '<wrong@example.test>',
        text: 'YES',
      }),
      reply({
        messageId: '<sent-echo@example.test>',
        autoSubmitted: 'auto-generated',
        text: 'YES',
      }),
      reply({
        messageId: '<forged@example.test>',
        authenticationResults: 'spf=fail; dkim=fail',
        text: 'YES',
      }),
    ];
    for (const attempt of attempts)
      expect((await fixture.service.processReply(attempt)).outcome).toBe('ignored');
    expect(fixture.store.all('invoices', InvoiceSchema)).toHaveLength(0);
  });

  it('marks an authenticated NO as not performed without creating an invoice', async () => {
    const fixture = await createFixture();
    await fixture.service.runMorningCheck({ now: new Date('2026-09-21T14:00:00Z'), force: true });
    const check = fixture.store.all('performance_checks', PerformanceCheckSchema)[0];
    const effect = fixture.store
      .effects('pending')
      .find((candidate) => candidate.kind === 'email.performance_check');
    if (check === undefined || effect === undefined) throw new Error('Missing morning fixture.');
    const payload = MailEffectSchema.parse(JSON.parse(effect.payload));
    const token = payload.text.match(/\[JLM-REPLY:[^\]]+\]/)?.[0];
    if (token === undefined) throw new Error('Missing correlation token.');
    const result = await fixture.service.processReply(
      reply({
        messageId: '<reply-no@example.test>',
        inReplyTo: check.data.outboundMessageId,
        text: `NO\n> ${token}`,
      }),
    );
    expect(result.outcome).toBe('no_invoice');
    expect(fixture.store.all('invoices', InvoiceSchema)).toHaveLength(0);
  });

  it('uses the show end instant across Houston midnight and DST boundaries', () => {
    expect(localDate(new Date('2026-03-08T05:30:00.000Z'), 'America/Chicago')).toBe('2026-03-07');
    expect(localDate(new Date('2026-03-08T07:30:00.000Z'), 'America/Chicago')).toBe('2026-03-08');
    expect(localDate(new Date('2026-11-01T06:30:00.000Z'), 'America/Chicago')).toBe('2026-11-01');
    expect(localDate(new Date('2026-11-01T07:30:00.000Z'), 'America/Chicago')).toBe('2026-11-01');
  });
});

async function createFixture(): Promise<{
  store: Store;
  service: BillingService;
  event: CalendarShowEvent;
  events: CalendarShowEvent[];
  show: Show;
  quote: Quote;
}> {
  const store = new Store(':memory:');
  stores.push(store);
  const storage = await mkdtemp(join(tmpdir(), 'jlm-billing-'));
  const customer: Customer = {
    name: 'Synthetic Client',
    email: 'client@example.test',
    phone: '',
    company: 'Synthetic Client LLC',
    billingName: 'Synthetic Client LLC',
    billingEmail: 'client@example.test',
    billingAddress: '100 Test Way\nHouston, TX 77002',
    poRequired: false,
    poNumber: '',
  };
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
  const quote: Quote = QuoteSchema.parse({
    showId: 'show-1',
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
  store.insert('customers', 'customer-1', customer);
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
      quoteVersion: 1,
      currency: 'USD',
      agreedTotalCents: 70_000,
    },
  };
  const events = [event];
  const calendar: PerformanceCalendarReader = { listShowEvents: async () => events };
  const options: BillingOptions = {
    operatorEmail: 'operator@example.test',
    performerEmail: 'operator@example.test',
    senderEmail: 'sender@example.test',
    publicSiteUrl: 'https://example.test',
    privateStoragePath: storage,
    sellerDisplayName: 'Justin LeBlanc (Demo)',
    sellerAddress: 'Demo address to confirm',
    demoMode: true,
    hostname: 'example.test',
    renderPdf: async (_html, outputPath) => writeFile(outputPath, '%PDF-1.4 synthetic fixture'),
  };
  return {
    store,
    service: new BillingService(store, calendar, options),
    event,
    events,
    show,
    quote,
  };
}

function reply(
  overrides: Partial<ReceivedMail> & Pick<ReceivedMail, 'messageId' | 'text'>,
): ReceivedMail {
  return {
    mailbox: 'INBOX',
    uidValidity: '42',
    uid: overrides.uid ?? 2,
    messageId: overrides.messageId,
    inReplyTo: overrides.inReplyTo ?? '<performance-check.show-show-1@example.test>',
    from: overrides.from ?? 'operator@example.test',
    subject: overrides.subject ?? '[Justin Demo][show-show-1] Did you play?',
    text: overrides.text,
    authenticationResults:
      overrides.authenticationResults ??
      'mx.google.com; spf=pass; dkim=pass header.i=@example.test; dmarc=pass header.from=example.test',
    autoSubmitted: overrides.autoSubmitted ?? '',
    precedence: overrides.precedence ?? '',
    returnPath: overrides.returnPath ?? '<operator@example.test>',
    receivedAt: overrides.receivedAt ?? '2026-09-21T15:00:00.000Z',
  };
}
