/** Verifies the isolated public Calendar projection never broadens or leaks provider data. */
import { createHmac } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import {
  PublicEventsCalendarReader,
  PublicEventsUnavailableError,
  type PublicEventsConfig,
} from '../apps/api/adapters/public-events.js';

const baseConfig: PublicEventsConfig = {
  enabled: true,
  calendarId: 'justin-public-shows@example.test',
  timezone: 'America/Chicago',
  idSecret: 's'.repeat(32),
  googleClientId: 'client-id',
  googleClientSecret: 'client-secret',
  googleRefreshToken: 'refresh-token',
};
const now = new Date('2026-09-22T12:00:00.000Z');

function event(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'google-event-1',
    status: 'confirmed',
    summary: '  Blue   Room  ',
    location: '  The Blue Room, Chicago  ',
    start: { dateTime: '2026-10-03T20:00:00-05:00', timeZone: 'America/Chicago' },
    end: { dateTime: '2026-10-03T22:00:00-05:00' },
    description: 'must not leak',
    attendees: [{ email: 'customer@example.test' }],
    ...overrides,
  };
}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function provider(pages: unknown[] = [{ items: [event()] }]): {
  request: typeof fetch;
  calls: string[];
} {
  const calls: string[] = [];
  let index = 0;
  const request: typeof fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url === 'https://oauth2.googleapis.com/token') {
      return response({ access_token: 'token' });
    }
    const value = pages[index] ?? { items: [] };
    index += 1;
    return value instanceof Response ? value : response(value);
  };
  return { request, calls };
}

describe('PublicEventsCalendarReader', () => {
  it('queries only the exact configured calendar with the bounded read-only query', async () => {
    const fixture = provider();
    const reader = new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    });
    const result = await reader.read();
    const list = new URL(fixture.calls[1] ?? '');
    expect(result.status).toBe('fresh');
    expect(list.pathname).toBe(
      `/calendar/v3/calendars/${encodeURIComponent(baseConfig.calendarId)}/events`,
    );
    expect(Object.fromEntries(list.searchParams)).toMatchObject({
      singleEvents: 'true',
      showDeleted: 'false',
      orderBy: 'startTime',
      maxResults: '250',
    });
    expect(fixture.calls.join('\n')).not.toMatch(
      /calendarList|freeBusy|primary|SHOW_CALENDAR_ID|POST.*events/,
    );
  });

  it('sends exact UTC bounds, propagates page tokens, and makes list reads with GET only', async () => {
    const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
    let listPage = 0;
    const request: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      if (String(input).includes('oauth2')) return response({ access_token: 'token' });
      listPage += 1;
      return response(listPage === 1 ? { items: [], nextPageToken: 'page two' } : { items: [] });
    };
    await new PublicEventsCalendarReader(baseConfig, { fetch: request, clock: () => now }).read();
    const first = new URL(calls[1]?.url ?? '');
    const second = new URL(calls[2]?.url ?? '');
    expect(first.searchParams.get('timeMin')).toBe(now.toISOString());
    expect(first.searchParams.get('timeMax')).toBe('2027-03-21T12:00:00.000Z');
    expect(second.searchParams.get('pageToken')).toBe('page two');
    expect(calls.slice(1).every((call) => call.init?.method === 'GET')).toBe(true);
  });

  it('does not read a private calendar even when a multi-calendar provider fixture offers it', async () => {
    const forbiddenCalendars = {
      'private-bookings@example.test': [
        event({ id: 'private-wedding', summary: 'Private wedding' }),
        event({ id: 'private-corporate', summary: 'Corporate reception' }),
      ],
      'consultations@example.test': [
        event({ id: 'private-consultation', summary: 'Consultation' }),
      ],
      'holds@example.test': [event({ id: 'private-hold', status: 'tentative', summary: 'Hold' })],
    };
    const observed: string[] = [];
    const request: typeof fetch = async (input) => {
      const url = String(input);
      observed.push(url);
      if (url.includes('oauth2')) return response({ access_token: 'token' });
      if (!url.includes(encodeURIComponent(baseConfig.calendarId)))
        throw new Error('unexpected calendar');
      return response({
        items: [
          event({
            id: 'public-only',
            summary: 'Wedding celebration at a public venue',
          }),
        ],
      });
    };
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: request,
      clock: () => now,
    }).read();
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.title).toBe('Wedding celebration at a public venue');
    for (const [calendarId, privateEvents] of Object.entries(forbiddenCalendars)) {
      expect(privateEvents.length).toBeGreaterThan(0);
      expect(observed.join('\n')).not.toContain(encodeURIComponent(calendarId));
      for (const privateEvent of privateEvents) {
        expect(JSON.stringify(result)).not.toContain(privateEvent.id);
      }
    }
  });

  it('reports only redacted aggregate failure metadata', async () => {
    const failures: unknown[] = [];
    const excluded: unknown[] = [];
    const fixture = provider([
      {
        items: [
          event(),
          event({
            id: 'private-provider-id',
            summary: 'Private client name',
            status: 'cancelled',
          }),
        ],
      },
    ]);
    await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
      reportExcluded: (counts) => excluded.push(counts),
      reportFailure: (failure) => failures.push(failure),
    }).read();
    expect(excluded).toEqual([{ excluded: 1 }]);
    expect(JSON.stringify(excluded)).not.toMatch(/private-provider-id|Private client name/);

    const forbidden = provider([response({ private: 'provider diagnostics' }, 403)]);
    await expect(
      new PublicEventsCalendarReader(baseConfig, {
        fetch: forbidden.request,
        clock: () => now,
        reportFailure: (failure) => failures.push(failure),
      }).read(),
    ).rejects.toBeInstanceOf(PublicEventsUnavailableError);
    expect(failures).toEqual([
      {
        where: 'refresh',
        kind: 'ProviderError',
        status: 403,
        remedy: 'Verify the exact Public Shows Calendar configuration and existing read grant.',
      },
    ]);
    expect(JSON.stringify(failures)).not.toMatch(
      /provider diagnostics|private-provider-id|Private client name|refresh-token|client-secret/,
    );
  });

  it('fails closed when disabled or exact-calendar configuration is absent and never calls providers', async () => {
    const fixture = provider();
    for (const config of [
      { ...baseConfig, enabled: false },
      { ...baseConfig, calendarId: '' },
      { ...baseConfig, timezone: 'Not/AZone' },
      { ...baseConfig, idSecret: 'short' },
      { ...baseConfig, googleClientId: '' },
      { ...baseConfig, googleClientSecret: '' },
      { ...baseConfig, googleRefreshToken: '' },
    ]) {
      await expect(
        new PublicEventsCalendarReader(config, { fetch: fixture.request, clock: () => now }).read(),
      ).rejects.toBeInstanceOf(PublicEventsUnavailableError);
    }
    expect(fixture.calls).toEqual([]);
  });

  it('accepts a successful empty projection but rejects malformed provider envelopes', async () => {
    const empty = provider([{ items: [] }]);
    await expect(
      new PublicEventsCalendarReader(baseConfig, { fetch: empty.request, clock: () => now }).read(),
    ).resolves.toEqual({
      events: [],
      status: 'fresh',
      lastUpdated: now.toISOString(),
    });
    for (const envelope of [{}, { items: null }]) {
      const malformed = provider([envelope]);
      await expect(
        new PublicEventsCalendarReader(baseConfig, {
          fetch: malformed.request,
          clock: () => now,
        }).read(),
      ).rejects.toBeInstanceOf(PublicEventsUnavailableError);
    }
  });

  it('uses a stable recurring-instance identity without exposing provider identifiers', async () => {
    const first = event({
      id: 'instance-one',
      recurringEventId: 'series-42',
      originalStartTime: { dateTime: '2026-10-03T20:00:00-05:00' },
    });
    const second = event({
      id: 'instance-two',
      recurringEventId: 'series-42',
      originalStartTime: { dateTime: '2026-10-10T20:00:00-05:00' },
    });
    const fixture = provider([{ items: [first, second] }]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    expect(result.events.map((item) => item.id)).toHaveLength(2);
    expect(new Set(result.events.map((item) => item.id)).size).toBe(2);
    expect(JSON.stringify(result)).not.toContain('series-42');
    expect(JSON.stringify(result)).not.toContain('instance-one');
  });

  it('excludes private, cancelled, tentative, all-day, malformed, and out-of-horizon records', async () => {
    const fixture = provider([
      {
        items: [
          event(),
          event({ status: 'cancelled' }),
          event({ status: 'tentative' }),
          event({ visibility: 'private' }),
          event({ visibility: 'confidential' }),
          event({ start: { date: '2026-10-03' } }),
          event({ summary: ' ' }),
          event({ end: { dateTime: '2026-10-03T19:00:00-05:00' } }),
          event({ start: { dateTime: '2027-04-01T20:00:00Z' } }),
        ],
      },
    ]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    expect(result.events).toHaveLength(1);
  });

  it('excludes unknown Calendar classifications and unsafe or invalid public field values', async () => {
    const fixture = provider([
      {
        items: [
          event(),
          event({ eventType: 'focusTime' }),
          event({ eventType: 'unknown' }),
          event({ visibility: 'restricted' }),
          event({ summary: '<b>Venue</b>' }),
          event({ location: 'Hall\u0007, Chicago' }),
          event({ start: { dateTime: '2026-10-03T20:00-05:00' } }),
          event({ start: { dateTime: '2026-02-29T20:00:00-05:00' } }),
          event({ start: { dateTime: '2026-10-03T20:00:61-05:00' } }),
          event({ start: { dateTime: '2026-10-03' } }),
        ],
      },
    ]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    expect(result.events).toHaveLength(1);
  });

  it('preserves cross-midnight and DST instants and falls back only for invalid provider timezones', async () => {
    const fixture = provider([
      {
        items: [
          event({
            id: 'cross',
            start: { dateTime: '2026-11-01T01:30:00-05:00', timeZone: 'America/Chicago' },
            end: { dateTime: '2026-11-01T02:30:00-06:00' },
          }),
          event({
            id: 'fallback',
            start: { dateTime: '2026-10-04T23:00:00-05:00', timeZone: 'Nope/Nope' },
            end: { dateTime: '2026-10-05T01:00:00-05:00' },
          }),
        ],
      },
    ]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    expect(result.events[0]).toMatchObject({
      start: '2026-10-04T23:00:00-05:00',
      end: '2026-10-05T01:00:00-05:00',
      timezone: 'America/Chicago',
    });
    expect(result.events[1]).toMatchObject({
      start: '2026-11-01T01:30:00-05:00',
      end: '2026-11-01T02:30:00-06:00',
    });
  });

  it('bounds complete pagination, selects chronological earliest 100, and fails on a fifth page', async () => {
    const events = Array.from({ length: 101 }, (_, index) =>
      event({
        id: `event-${index}`,
        start: { dateTime: `2026-10-${String((index % 28) + 1).padStart(2, '0')}T20:00:00Z` },
        end: { dateTime: `2026-10-${String((index % 28) + 1).padStart(2, '0')}T22:00:00Z` },
      }),
    );
    const withinBounds = provider([{ items: events.reverse() }]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: withinBounds.request,
      clock: () => now,
    }).read();
    expect(result.events).toHaveLength(100);
    const pages = provider([
      { items: [], nextPageToken: 'two' },
      { items: [], nextPageToken: 'three' },
      { items: [], nextPageToken: 'four' },
      { items: [], nextPageToken: 'five' },
    ]);
    await expect(
      new PublicEventsCalendarReader(baseConfig, { fetch: pages.request, clock: () => now }).read(),
    ).rejects.toBeInstanceOf(PublicEventsUnavailableError);
    expect(pages.calls).toHaveLength(5);
  });

  it('collapses bounded text and returns only the strict sanitized projection', async () => {
    const fixture = provider([
      {
        items: [
          event({
            description: 'private note',
            htmlLink: 'https://google.test/private',
            attendees: [{ email: 'x@test' }],
            conferenceData: { entryPoints: [] },
          }),
        ],
      },
    ]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    expect(result.events[0]).toEqual(
      expect.objectContaining({ title: 'Blue Room', venue: 'The Blue Room, Chicago' }),
    );
    expect(Object.keys(result.events[0] ?? {}).sort()).toEqual([
      'end',
      'id',
      'start',
      'timezone',
      'title',
      'venue',
    ]);
    expect(JSON.stringify(result)).not.toMatch(/private note|google\.test|x@test|google-event/);
  });

  it('generates the v1 HMAC vector and changes it only with its protected inputs', async () => {
    const fixture = provider([{ items: [event({ id: 'provider-id-123' })] }]);
    const result = await new PublicEventsCalendarReader(baseConfig, {
      fetch: fixture.request,
      clock: () => now,
    }).read();
    const expected = createHmac('sha256', baseConfig.idSecret)
      .update(`jlm-public-event:v1\0${baseConfig.calendarId}\0provider-id-123`, 'utf8')
      .digest('base64url')
      .slice(0, 22);
    expect(result.events[0]?.id).toBe(`pe_${expected}`);
    const same = provider([{ items: [event({ id: 'provider-id-123' })] }]);
    const differentCalendar = provider([{ items: [event({ id: 'provider-id-123' })] }]);
    const differentSecret = provider([{ items: [event({ id: 'provider-id-123' })] }]);
    const stable = await new PublicEventsCalendarReader(baseConfig, {
      fetch: same.request,
      clock: () => now,
    }).read();
    const changedCalendar = await new PublicEventsCalendarReader(
      { ...baseConfig, calendarId: 'other-public@example.test' },
      { fetch: differentCalendar.request, clock: () => now },
    ).read();
    const changedSecret = await new PublicEventsCalendarReader(
      { ...baseConfig, idSecret: 'x'.repeat(32) },
      { fetch: differentSecret.request, clock: () => now },
    ).read();
    expect(stable.events[0]?.id).toBe(result.events[0]?.id);
    expect(changedCalendar.events[0]?.id).not.toBe(result.events[0]?.id);
    expect(changedSecret.events[0]?.id).not.toBe(result.events[0]?.id);
  });

  it('coalesces concurrent refreshes and uses five-minute fresh then 24-hour stale cache only', async () => {
    let current = now.getTime();
    let resolver: ((value: Response) => void) | undefined;
    let calls = 0;
    const request: typeof fetch = async (input) => {
      calls += 1;
      if (String(input).includes('oauth2')) return response({ access_token: 'token' });
      if (calls > 2) return response({}, 500);
      return new Promise<Response>((resolve) => {
        resolver = resolve;
      });
    };
    const reader = new PublicEventsCalendarReader(baseConfig, {
      fetch: request,
      clock: () => new Date(current),
    });
    const one = reader.read();
    const two = reader.read();
    await vi.waitFor(() => expect(resolver).toBeTypeOf('function'));
    resolver?.(response({ items: [event()] }));
    expect((await one).events).toHaveLength(1);
    await two;
    expect(calls).toBe(2);
    current += 5 * 60 * 1000 + 1;
    const stale = await reader.read();
    expect(stale.status).toBe('stale');
    expect(stale.lastUpdated).toBe((await one).lastUpdated);
    expect(stale.events).toEqual((await one).events);
    current += 24 * 60 * 60 * 1000 + 1;
    await expect(reader.read()).rejects.toBeInstanceOf(PublicEventsUnavailableError);
  });

  it('enforces the full deadline, retries exactly once for 429/5xx, and never retries 401/403', async () => {
    vi.useFakeTimers();
    try {
      const never: typeof fetch = async () => new Promise<Response>(() => undefined);
      const waiting = new PublicEventsCalendarReader(baseConfig, {
        fetch: never,
        clock: () => new Date(),
      }).read();
      const unavailable = expect(waiting).rejects.toBeInstanceOf(PublicEventsUnavailableError);
      await vi.advanceTimersByTimeAsync(8_001);
      await unavailable;
    } finally {
      vi.useRealTimers();
    }
    for (const status of [429, 500, 503]) {
      const fixture = provider([response({}, status), { items: [event()] }]);
      await expect(
        new PublicEventsCalendarReader(baseConfig, {
          fetch: fixture.request,
          clock: () => now,
        }).read(),
      ).resolves.toMatchObject({ status: 'fresh' });
      expect(fixture.calls).toHaveLength(3);
    }
    for (const status of [401, 403]) {
      const fixture = provider([response({}, status)]);
      await expect(
        new PublicEventsCalendarReader(baseConfig, {
          fetch: fixture.request,
          clock: () => now,
        }).read(),
      ).rejects.toBeInstanceOf(PublicEventsUnavailableError);
      expect(fixture.calls).toHaveLength(2);
    }
  });

  it('times out a stalled response body and aborts its exact provider request', async () => {
    vi.useFakeTimers();
    try {
      let listSignal: AbortSignal | undefined;
      const delayed = response({ items: [event()] });
      vi.spyOn(delayed, 'json').mockImplementation(() => new Promise<unknown>(() => undefined));
      const request: typeof fetch = async (input, init) => {
        if (String(input).includes('oauth2')) return response({ access_token: 'token' });
        listSignal = init?.signal ?? undefined;
        return delayed;
      };
      const waiting = new PublicEventsCalendarReader(baseConfig, {
        fetch: request,
        clock: () => new Date(),
      }).read();
      const unavailable = expect(waiting).rejects.toBeInstanceOf(PublicEventsUnavailableError);
      await vi.advanceTimersByTimeAsync(8_001);
      await unavailable;
      expect(listSignal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
