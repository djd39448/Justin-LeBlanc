/** Verifies deferred calendar readiness and deterministic uncertain-write reconciliation offline. */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { CalendarEffectDispatcher, GoogleCalendarAdapter } from '../apps/api/adapters/calendar.js';
import { ConfigSchema } from '../apps/api/config.js';
import { Store } from '../apps/api/store.js';

const baseConfig = {
  NODE_ENV: 'test',
  ADMIN_TOKEN: 'a'.repeat(32),
  JOB_AUTH_SECRET: 'j'.repeat(32),
  DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test,client@example.test',
  OPERATOR_EMAIL: 'operator@example.test',
  PERFORMER_EMAIL: 'operator@example.test',
  CLIENT_TEST_EMAIL: 'client@example.test',
};

function seedTentativeShow(store: Store): void {
  store.insert('customers', 'customer-1', {
    name: 'Synthetic Client',
    email: 'client@example.test',
    phone: '',
    company: '',
    billingName: '',
    billingEmail: '',
    billingAddress: '',
    poRequired: false,
    poNumber: '',
  });
  store.insert('consultations', 'consultation-1', {
    inquiryId: 'inquiry-1',
    showId: 'show-1',
    start: '2026-10-01T14:00:00.000Z',
    end: '2026-10-01T14:20:00.000Z',
    timezone: 'America/New_York',
    status: 'scheduled',
  });
  store.insert('shows', 'show-1', {
    inquiryId: 'inquiry-1',
    customerId: 'customer-1',
    eventType: 'private',
    venue: 'Demo Venue',
    city: 'Houston',
    start: '2026-11-14T20:00:00.000Z',
    end: '2026-11-14T22:00:00.000Z',
    timezone: 'America/Chicago',
    bufferBeforeMinutes: 120,
    bufferAfterMinutes: 90,
    status: 'tentative',
    holdExpiresAt: '2026-10-03T14:20:00.000Z',
    quoteId: null,
    consultationId: 'consultation-1',
    synthetic: true,
  });
}

describe('GoogleCalendarAdapter readiness', () => {
  it('allows server construction and fails only when an unconfigured network method is used', async () => {
    const config = ConfigSchema.parse(baseConfig);
    expect(() => new GoogleCalendarAdapter(config)).not.toThrow();
    await expect(
      new GoogleCalendarAdapter(config).busy(
        '2026-10-01T00:00:00.000Z',
        '2026-10-02T00:00:00.000Z',
      ),
    ).rejects.toThrow('Google Calendar user OAuth is not configured');
  });

  it('requests expanded instances and preserves recurring and all-day identity safely', async () => {
    const config = ConfigSchema.parse({
      ...baseConfig,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REFRESH_TOKEN: 'refresh-token',
      SHOW_CALENDAR_ID: 'jlm-demo-calendar@example.test',
    });
    let listUrl = '';
    const request: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'access-token', expires_in: 3600 }), {
          status: 200,
        });
      }
      listUrl = url;
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'instance-datetime',
              etag: 'etag-datetime',
              status: 'confirmed',
              start: { dateTime: '2026-11-14T20:00:00-06:00', timeZone: 'America/Chicago' },
              end: { dateTime: '2026-11-14T22:00:00-06:00', timeZone: 'America/Chicago' },
              recurringEventId: 'series-datetime',
              originalStartTime: { dateTime: '2026-11-14T20:00:00-06:00' },
            },
            {
              id: 'instance-all-day',
              etag: 'etag-all-day',
              status: 'cancelled',
              start: { date: '2026-11-15' },
              end: { date: '2026-11-16' },
              recurringEventId: 'series-all-day',
              originalStartTime: { date: '2026-11-15' },
            },
            {
              id: 'cancelled-exception',
              etag: 'etag-cancelled-exception',
              status: 'cancelled',
              recurringEventId: 'series-datetime',
              originalStartTime: { dateTime: '2026-11-21T20:00:00-06:00' },
            },
          ],
        }),
        { status: 200 },
      );
    };
    const events = await new GoogleCalendarAdapter(config, request).listShowEvents({
      timeMin: '2026-11-01T00:00:00.000Z',
      timeMax: '2026-12-01T00:00:00.000Z',
    });
    const query = new URL(listUrl).searchParams;
    expect(query.get('singleEvents')).toBe('true');
    expect(query.get('showDeleted')).toBe('true');
    expect(query.get('timeMin')).toBe('2026-11-01T00:00:00.000Z');
    expect(query.get('timeMax')).toBe('2026-12-01T00:00:00.000Z');
    expect(events).toMatchObject([
      {
        eventId: 'instance-datetime',
        recurringEventId: 'series-datetime',
        originalStart: '2026-11-14T20:00:00-06:00',
        start: { kind: 'dateTime', dateTime: '2026-11-14T20:00:00-06:00' },
      },
      {
        eventId: 'instance-all-day',
        recurringEventId: 'series-all-day',
        originalStart: '2026-11-15',
        start: { kind: 'allDay', date: '2026-11-15' },
        end: { kind: 'allDay', date: '2026-11-16' },
      },
      {
        eventId: 'cancelled-exception',
        status: 'cancelled',
        recurringEventId: 'series-datetime',
        originalStart: '2026-11-21T20:00:00-06:00',
        start: { kind: 'dateTime', dateTime: '2026-11-21T20:00:00-06:00' },
        end: { kind: 'dateTime', dateTime: '2026-11-21T20:00:00-06:00' },
      },
    ]);
  });
});

describe('CalendarEffectDispatcher', () => {
  it('creates a deterministic owned event and reconciles it by exact private metadata', async () => {
    const config = ConfigSchema.parse({
      ...baseConfig,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REFRESH_TOKEN: 'refresh-token',
      SHOW_CALENDAR_ID: 'jlm-demo-calendar@example.test',
    });
    let createdEvent: Record<string, unknown> | undefined;
    const request: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes('oauth2.googleapis.com')) {
        return new Response(JSON.stringify({ access_token: 'access-token', expires_in: 3600 }), {
          status: 200,
        });
      }
      if (init?.method === 'POST') {
        if (typeof init.body !== 'string') throw new Error('Expected JSON event body.');
        createdEvent = z.record(z.string(), z.unknown()).parse(JSON.parse(init.body));
        return new Response(JSON.stringify({ ...createdEvent, etag: 'etag-1' }), { status: 200 });
      }
      if (init?.method === 'GET' && createdEvent !== undefined) {
        return new Response(JSON.stringify({ ...createdEvent, etag: 'etag-1' }), { status: 200 });
      }
      return new Response('', { status: 404 });
    };
    const store = new Store(':memory:');
    seedTentativeShow(store);
    const dispatcher = new CalendarEffectDispatcher(
      store,
      new GoogleCalendarAdapter(config, request),
      config,
    );
    const payload = { version: 1, showId: 'show-1', role: 'performance', reason: 'initial_hold' };
    const sent = await dispatcher.send('calendar.upsert', payload);
    expect(sent.providerId).toMatch(/^[0-9a-f]{32}$/);
    store.db.prepare('DELETE FROM calendar_links').run();
    const matchingEvent = createdEvent;
    if (matchingEvent === undefined) throw new Error('Expected captured provider event.');
    const staleProviderStates: Record<string, unknown>[] = [
      { ...matchingEvent, status: 'confirmed' },
      {
        ...matchingEvent,
        start: {
          dateTime: '2026-11-14T21:00:00.000Z',
          timeZone: 'America/Chicago',
        },
      },
      {
        ...matchingEvent,
        end: {
          dateTime: '2026-11-14T23:00:00.000Z',
          timeZone: 'America/Chicago',
        },
      },
      { ...matchingEvent, attendees: [] },
      {
        ...matchingEvent,
        extendedProperties: {
          private: {
            tenantId: 'jlm-demo',
            showId: 'show-1',
            customerId: 'customer-1',
            role: 'performance',
            quoteVersion: '1',
          },
        },
      },
    ];
    for (const stale of staleProviderStates) {
      createdEvent = stale;
      await expect(dispatcher.reconcile('calendar.upsert', payload)).resolves.toEqual({
        status: 'uncertain',
        providerId: sent.providerId,
      });
    }
    createdEvent = matchingEvent;
    const reconciled = await dispatcher.reconcile('calendar.upsert', payload);
    expect(reconciled).toEqual({ status: 'accepted', providerId: sent.providerId });
    expect(store.db.prepare('SELECT count(*) AS count FROM calendar_links').get()).toEqual({
      count: 1,
    });
    store.close();
  });
});
