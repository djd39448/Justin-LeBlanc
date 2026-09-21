/**
 * Proves outbox kill switches, uncertainty reconciliation, and batch leases with real SQLite.
 * Dependencies: Vitest, Store, OutboxDispatcher. Why: provider retries must never duplicate mail.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { MailEffectSchema, UncertainEmailSendError } from '../apps/api/adapters/email.js';
import { ConfigSchema, type Config } from '../apps/api/config.js';
import {
  OutboxDispatcher,
  type BriefPreparer,
  type CalendarEffectAdapter,
  type InvoiceDeliveryTracker,
  type OutboxMailSender,
  type SentMailReconciler,
} from '../apps/api/jobs/outbox.js';
import { Store } from '../apps/api/store.js';

const stores: Store[] = [];

afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('outbox dispatcher', () => {
  it('gates reminders with invoice email independently of the morning scan', async () => {
    const store = makeStore();
    enqueueBookingMail(store, 'email.performance_reminder');
    let sends = 0;
    const sender = {
      send: async () => {
        sends += 1;
        return { providerMessageId: '<reminder@example.test>' };
      },
    };
    const disabled = createDispatcher(
      store,
      {
        ...config(false),
        INVOICE_SEND_ENABLED: false,
        MORNING_SCAN_ENABLED: true,
      },
      sender,
    );
    expect((await disabled.dispatchPending()).skipped).toBe(1);
    expect(sends).toBe(0);
    const enabled = createDispatcher(
      store,
      {
        ...config(false),
        INVOICE_SEND_ENABLED: true,
        MORNING_SCAN_ENABLED: false,
      },
      sender,
    );
    expect((await enabled.dispatchPending()).accepted).toBe(1);
    expect(sends).toBe(1);
  });
  it('leaves a booking email pending when its final-boundary kill switch is disabled', async () => {
    const store = makeStore();
    enqueueBookingMail(store);
    let sends = 0;
    const dispatcher = createDispatcher(store, config(false), {
      send: async () => {
        sends += 1;
        return { providerMessageId: '<booking@example.test>' };
      },
    });
    expect(await dispatcher.dispatchPending()).toEqual({
      accepted: 0,
      uncertain: 0,
      failed: 0,
      skipped: 1,
    });
    expect(sends).toBe(0);
    expect(store.effects('pending')).toHaveLength(1);
  });

  it('keeps every booking calendar effect pending while booking writes are disabled', async () => {
    const store = makeStore();
    store.enqueue('calendar:cancel:show-1', 'calendar.cancel', 'show-1', {
      version: 1,
      showId: 'show-1',
      role: 'performance',
      reason: 'hold_expired',
    });
    let sends = 0;
    const calendar: CalendarEffectAdapter = {
      send: async () => {
        sends += 1;
        return { providerId: 'calendar-test' };
      },
      reconcile: async () => ({ status: 'not_found', providerId: null }),
    };
    const dispatcher = createDispatcher(
      store,
      config(false),
      { send: async () => ({ providerMessageId: '<unused@example.test>' }) },
      undefined,
      calendar,
    );
    expect((await dispatcher.dispatchPending()).skipped).toBe(1);
    expect(sends).toBe(0);
    expect(store.effects('pending')).toHaveLength(1);
  });

  it('reconciles an uncertain SMTP result by Message-ID without a second send', async () => {
    const store = makeStore();
    enqueueBookingMail(store);
    let sends = 0;
    const dispatcher = createDispatcher(
      store,
      config(true),
      {
        send: async (mail) => {
          sends += 1;
          throw new UncertainEmailSendError(mail.messageId, 'synthetic timeout');
        },
      },
      { sentContains: async () => true },
    );
    expect((await dispatcher.dispatchPending()).uncertain).toBe(1);
    expect(sends).toBe(1);
    expect(await dispatcher.reconcileUncertain('mail:booking:show-1')).toBe('accepted');
    expect(sends).toBe(1);
    expect(store.effects('accepted')).toHaveLength(1);
  });

  it('does not recover a sending effect while another batch lease is active', async () => {
    const store = makeStore();
    enqueueBookingMail(store);
    expect(store.claimEffect('mail:booking:show-1')).toBe(true);
    expect(store.acquireLease('provider:outbox', 'active-worker', 60_000)).toBe(true);
    const dispatcher = createDispatcher(store, config(true), {
      send: async () => ({ providerMessageId: '<booking@example.test>' }),
    });
    await expect(dispatcher.recoverInterrupted()).rejects.toThrow('already active');
    expect(store.effects('sending')).toHaveLength(1);
    store.releaseLease('provider:outbox', 'active-worker');
  });

  it('revalidates and audits a manual retry of a definitively failed effect', async () => {
    const store = makeStore();
    enqueueBookingMail(store);
    store.effectResult(
      'mail:booking:show-1',
      'failed',
      null,
      'Synthetic pre-provider validation failure',
    );
    const dispatcher = createDispatcher(store, config(true), {
      send: async () => ({ providerMessageId: '<booking@example.test>' }),
    });

    await expect(dispatcher.retryFailed('mail:booking:show-1')).resolves.toBe('pending');
    expect(store.effects('pending')).toHaveLength(1);
    expect(store.effects('pending')[0]?.error).toBeNull();
    expect(
      store.db
        .prepare(
          "SELECT COUNT(*) AS count FROM audit_events WHERE json_extract(data,'$.action')='outbox.retry_failed' AND json_extract(data,'$.entityId')=?",
        )
        .get('mail:booking:show-1'),
    ).toEqual({ count: 1 });
  });

  it('rejects manual retry of an uncertain effect without changing its state', async () => {
    const store = makeStore();
    enqueueBookingMail(store);
    store.effectResult('mail:booking:show-1', 'uncertain', null, 'Synthetic provider timeout');
    const dispatcher = createDispatcher(store, config(true), {
      send: async () => ({ providerMessageId: '<booking@example.test>' }),
    });

    await expect(dispatcher.retryFailed('mail:booking:show-1')).rejects.toThrow(
      'is uncertain; only definitively failed effects can be retried',
    );
    expect(store.effects('uncertain')).toHaveLength(1);
    expect(store.effects('pending')).toHaveLength(0);
  });
});

function makeStore(): Store {
  const store = new Store(':memory:');
  stores.push(store);
  return store;
}

function enqueueBookingMail(store: Store, kind = 'email.booking_confirmation'): void {
  const mail = MailEffectSchema.parse({
    version: 1,
    messageId: '<booking@example.test>',
    envelopeFrom: 'sender@example.test',
    to: ['client@example.test'],
    cc: [],
    bcc: [],
    replyTo: 'sender@example.test',
    subject: 'Booking confirmation',
    text: 'Synthetic booking confirmation',
    html: '<p>Synthetic booking confirmation</p>',
    headers: {},
    attachments: [],
  });
  store.enqueue('mail:booking:show-1', kind, 'show-1', mail);
}

function config(bookingEnabled: boolean): Config {
  return ConfigSchema.parse({
    NODE_ENV: 'test',
    ADMIN_TOKEN: 'a'.repeat(32),
    JOB_AUTH_SECRET: 'j'.repeat(32),
    DEMO_RECIPIENT_ALLOWLIST: 'client@example.test,operator@example.test,sender@example.test',
    OPERATOR_EMAIL: 'operator@example.test',
    PERFORMER_EMAIL: 'operator@example.test',
    CLIENT_TEST_EMAIL: 'client@example.test',
    BOOKING_WRITES_ENABLED: String(bookingEnabled),
    INVOICE_SEND_ENABLED: 'true',
    MORNING_SCAN_ENABLED: 'true',
  });
}

function createDispatcher(
  store: Store,
  appConfig: Config,
  smtp: OutboxMailSender,
  imap: SentMailReconciler = { sentContains: async () => false },
  calendar: CalendarEffectAdapter = {
    send: async () => ({ providerId: 'calendar-test' }),
    reconcile: async () => ({ status: 'not_found', providerId: null }),
  },
): OutboxDispatcher {
  const billing: InvoiceDeliveryTracker = { markInvoiceDelivery: () => undefined };
  const briefs: BriefPreparer = { prepare: async () => ({ pdfPath: 'synthetic.pdf' }) };
  return new OutboxDispatcher(store, smtp, imap, calendar, billing, briefs, appConfig);
}
