/**
 * Projects one exact Google Calendar into a bounded, sanitized public-events DTO.
 *
 * Dependencies: server-only OAuth configuration, injected Fetch, Clock, and Node crypto.
 * Depended on by: the public-events HTTP route (wired separately from booking Calendar code).
 * Why this exists: public listings are a read-only allowlist boundary, never a Calendar discovery
 * or booking path. Raw provider payloads deliberately do not survive a successful refresh.
 */
import { createHmac } from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const HORIZON_DAYS = 180;
const MAX_PAGES = 4;
const MAX_EVENTS = 100;
const FRESH_MS = 5 * 60 * 1000;
const STALE_MS = 24 * 60 * 60 * 1000;
const PROVIDER_DEADLINE_MS = 8 * 1000;
const RFC_3339_INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(?:Z|([+-])(\d{2}):(\d{2}))$/;
const UNSAFE_PUBLIC_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f<>]/u;

export interface PublicEventsConfig {
  enabled: boolean;
  calendarId: string;
  timezone: string;
  idSecret: string;
  googleClientId: string;
  googleClientSecret: string;
  googleRefreshToken: string;
}

export interface PublicEvent {
  id: string;
  title: string;
  venue: string;
  city?: string;
  start: string;
  end: string;
  timezone: string;
}

export interface PublicEventsResponse {
  events: PublicEvent[];
  status: 'fresh' | 'stale';
  lastUpdated: string;
}

export interface PublicEventsUnavailable {
  error: 'public_events_unavailable';
  message: 'Current dates are temporarily unavailable.';
}

export const PUBLIC_EVENTS_UNAVAILABLE: PublicEventsUnavailable = {
  error: 'public_events_unavailable',
  message: 'Current dates are temporarily unavailable.',
};

/** An intentionally opaque error suitable for the route's fixed 503 response. */
export class PublicEventsUnavailableError extends Error {
  readonly publicBody = PUBLIC_EVENTS_UNAVAILABLE;

  constructor() {
    super(PUBLIC_EVENTS_UNAVAILABLE.error);
    this.name = 'PublicEventsUnavailableError';
  }
}

export interface PublicEventsReaderDependencies {
  fetch?: typeof fetch;
  clock?: () => Date;
  /** Receives only aggregate counts; it never receives a provider event or identifier. */
  reportExcluded?: (counts: { excluded: number }) => void;
  /** Receives only redacted failure metadata; it never receives provider payloads or URLs. */
  reportFailure?: (failure: PublicEventsFailure) => void;
}

export interface PublicEventsFailure {
  where: 'refresh';
  kind: string;
  status: number | null;
  remedy: string;
}

interface GoogleEventTime {
  dateTime?: unknown;
  timeZone?: unknown;
}

interface GoogleEvent {
  id?: unknown;
  recurringEventId?: unknown;
  originalStartTime?: GoogleEventTime;
  status?: unknown;
  eventType?: unknown;
  visibility?: unknown;
  summary?: unknown;
  location?: unknown;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
}

interface EventPage {
  items: GoogleEvent[];
  nextPageToken?: string;
}

interface CachedProjection {
  events: PublicEvent[];
  lastUpdated: string;
  refreshedAt: number;
}

class ProviderError extends Error {
  constructor(
    readonly status: number | null,
    message = 'Provider request failed',
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parsePage(value: unknown): EventPage {
  const record = asRecord(value);
  if (record === null || !Array.isArray(record.items)) {
    throw new ProviderError(null, 'Provider payload is malformed');
  }
  const nextPageToken = record.nextPageToken;
  if (
    nextPageToken !== undefined &&
    (typeof nextPageToken !== 'string' || nextPageToken.length === 0)
  ) {
    throw new ProviderError(null, 'Provider pagination is malformed');
  }
  return {
    items: record.items.map((item) => (asRecord(item) ?? {}) as GoogleEvent),
    ...(nextPageToken === undefined ? {} : { nextPageToken }),
  };
}

function collapsePublicText(value: unknown, maximum: number): string | null {
  if (typeof value !== 'string' || UNSAFE_PUBLIC_TEXT.test(value)) return null;
  const normalized = value.trim().replace(/\s+/g, ' ');
  return normalized.length >= 1 && normalized.length <= maximum ? normalized : null;
}

function parseInstant(value: unknown): { value: string; milliseconds: number } | null {
  if (typeof value !== 'string') return null;
  const match = RFC_3339_INSTANT.exec(value);
  if (match === null) return null;
  const [
    ,
    yearText,
    monthText,
    dayText,
    hourText,
    minuteText,
    secondText,
    ,
    offsetHour,
    offsetMinute,
  ] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const dateOnly = new Date(Date.UTC(year, month - 1, day));
  if (
    dateOnly.getUTCFullYear() !== year ||
    dateOnly.getUTCMonth() !== month - 1 ||
    dateOnly.getUTCDate() !== day ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (offsetHour !== undefined && Number(offsetHour) > 23) ||
    (offsetMinute !== undefined && Number(offsetMinute) > 59)
  ) {
    return null;
  }
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? { value, milliseconds } : null;
}

function validIanaTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

function configured(config: PublicEventsConfig): boolean {
  return (
    config.enabled &&
    config.calendarId.trim().length > 0 &&
    Buffer.byteLength(config.idSecret, 'utf8') >= 32 &&
    config.googleClientId.length > 0 &&
    config.googleClientSecret.length > 0 &&
    config.googleRefreshToken.length > 0 &&
    validIanaTimezone(config.timezone)
  );
}

/**
 * Reads only the configured Public Shows Calendar and retains only a sanitized projection.
 * The class is process-local by design: callers should instantiate it once at application startup.
 */
export class PublicEventsCalendarReader {
  private cache: CachedProjection | null = null;
  private inFlight: Promise<CachedProjection> | null = null;
  private readonly request: typeof fetch;
  private readonly clock: () => Date;
  private readonly reportExcluded: (counts: { excluded: number }) => void;
  private readonly reportFailure: (failure: PublicEventsFailure) => void;

  constructor(
    private readonly config: PublicEventsConfig,
    dependencies: PublicEventsReaderDependencies = {},
  ) {
    this.request = dependencies.fetch ?? fetch;
    this.clock = dependencies.clock ?? (() => new Date());
    this.reportExcluded = dependencies.reportExcluded ?? (() => undefined);
    this.reportFailure = dependencies.reportFailure ?? (() => undefined);
  }

  /** Returns a fresh or last-known-good public projection, or throws an opaque unavailable error. */
  async read(): Promise<PublicEventsResponse> {
    const now = this.clock().getTime();
    if (!configured(this.config)) throw new PublicEventsUnavailableError();
    if (this.cache !== null && now - this.cache.refreshedAt <= FRESH_MS) {
      return this.response(this.cache, 'fresh');
    }
    try {
      const refreshed = await this.refreshCoalesced();
      return this.response(refreshed, 'fresh');
    } catch (error) {
      this.reportFailure({
        where: 'refresh',
        kind: error instanceof Error ? error.name : 'UnknownError',
        status: error instanceof ProviderError ? error.status : null,
        remedy: 'Verify the exact Public Shows Calendar configuration and existing read grant.',
      });
      const staleNow = this.clock().getTime();
      if (this.cache !== null && staleNow - this.cache.refreshedAt <= STALE_MS) {
        return this.response(this.cache, 'stale');
      }
      throw new PublicEventsUnavailableError();
    }
  }

  private response(cache: CachedProjection, status: 'fresh' | 'stale'): PublicEventsResponse {
    return {
      events: cache.events.map((event) => ({ ...event })),
      status,
      lastUpdated: cache.lastUpdated,
    };
  }

  private refreshCoalesced(): Promise<CachedProjection> {
    if (this.inFlight !== null) return this.inFlight;
    const refreshing = this.refresh();
    this.inFlight = refreshing;
    void refreshing.then(
      () => {
        if (this.inFlight === refreshing) this.inFlight = null;
      },
      () => {
        if (this.inFlight === refreshing) this.inFlight = null;
      },
    );
    return refreshing;
  }

  private async refresh(): Promise<CachedProjection> {
    const startedAt = this.clock().getTime();
    const deadline = startedAt + PROVIDER_DEADLINE_MS;
    const horizon = new Date(startedAt + HORIZON_DAYS * 24 * 60 * 60 * 1000);
    const accessToken = await this.accessToken(deadline);
    const rawEvents: GoogleEvent[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const query = new URLSearchParams({
        timeMin: new Date(startedAt).toISOString(),
        timeMax: horizon.toISOString(),
        singleEvents: 'true',
        showDeleted: 'false',
        orderBy: 'startTime',
        maxResults: '250',
      });
      if (pageToken !== undefined) query.set('pageToken', pageToken);
      const url = `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(this.config.calendarId)}/events?${query.toString()}`;
      const raw = await this.providerJson(
        url,
        { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
        deadline,
      );
      const pageResult = parsePage(raw);
      rawEvents.push(...pageResult.items);
      if (pageResult.nextPageToken === undefined) break;
      if (page === MAX_PAGES - 1)
        throw new ProviderError(null, 'Provider pagination exceeded bound');
      pageToken = pageResult.nextPageToken;
    }
    const events: PublicEvent[] = [];
    let excluded = 0;
    for (const event of rawEvents) {
      const projected = this.project(event, startedAt, horizon.getTime());
      if (projected === null) excluded += 1;
      else events.push(projected);
    }
    if (excluded > 0) this.reportExcluded({ excluded });
    events.sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
    const cache: CachedProjection = {
      events: events.slice(0, MAX_EVENTS),
      lastUpdated: this.clock().toISOString(),
      refreshedAt: this.clock().getTime(),
    };
    this.cache = cache;
    return cache;
  }

  private project(event: GoogleEvent, now: number, horizon: number): PublicEvent | null {
    if (
      event.status !== 'confirmed' ||
      (event.eventType !== undefined && event.eventType !== 'default') ||
      !(
        event.visibility === undefined ||
        event.visibility === 'default' ||
        event.visibility === 'public'
      )
    ) {
      return null;
    }
    const title = collapsePublicText(event.summary, 120);
    const venue = collapsePublicText(event.location, 160);
    const start = parseInstant(event.start?.dateTime);
    const end = parseInstant(event.end?.dateTime);
    if (
      title === null ||
      venue === null ||
      start === null ||
      end === null ||
      start.milliseconds < now ||
      start.milliseconds > horizon ||
      end.milliseconds <= start.milliseconds
    ) {
      return null;
    }
    const timezone = validIanaTimezone(event.start?.timeZone)
      ? event.start.timeZone
      : this.config.timezone;
    const identity = this.identity(event);
    if (identity === null) return null;
    const id = createHmac('sha256', this.config.idSecret)
      .update(['jlm-public-event:v1', this.config.calendarId, ...identity].join('\0'), 'utf8')
      .digest('base64url')
      .slice(0, 22);
    return { id: `pe_${id}`, title, venue, start: start.value, end: end.value, timezone };
  }

  private identity(event: GoogleEvent): string[] | null {
    if (typeof event.recurringEventId === 'string' && event.recurringEventId.length > 0) {
      const originalStart = parseInstant(event.originalStartTime?.dateTime);
      return originalStart === null ? null : [event.recurringEventId, originalStart.value];
    }
    return typeof event.id === 'string' && event.id.length > 0 ? [event.id] : null;
  }

  private async accessToken(deadline: number): Promise<string> {
    const body = new URLSearchParams({
      client_id: this.config.googleClientId,
      client_secret: this.config.googleClientSecret,
      refresh_token: this.config.googleRefreshToken,
      grant_type: 'refresh_token',
    });
    const raw = await this.providerJson(
      GOOGLE_TOKEN_URL,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body },
      deadline,
    );
    const value = asRecord(raw);
    if (
      value === null ||
      typeof value.access_token !== 'string' ||
      value.access_token.length === 0
    ) {
      throw new ProviderError(null, 'Token payload is malformed');
    }
    return value.access_token;
  }

  private async providerJson(url: string, init: RequestInit, deadline: number): Promise<unknown> {
    let retry = 0;
    while (true) {
      try {
        return await this.fetchJsonBeforeDeadline(url, init, deadline);
      } catch (error) {
        const retryable =
          error instanceof ProviderError &&
          error.status !== null &&
          (error.status === 429 || error.status >= 500);
        if (!retryable || retry === 1) throw error;
        retry += 1;
      }
    }
  }

  private async fetchJsonBeforeDeadline(
    url: string,
    init: RequestInit,
    deadline: number,
  ): Promise<unknown> {
    const remaining = deadline - this.clock().getTime();
    if (remaining <= 0) throw new ProviderError(null, 'Provider deadline exceeded');
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new ProviderError(null, 'Provider deadline exceeded'));
      }, remaining);
    });
    try {
      return await Promise.race([
        (async () => {
          const response = await this.request(url, { ...init, signal: controller.signal });
          if (!response.ok) throw new ProviderError(response.status);
          let value: unknown;
          try {
            value = await response.json();
          } catch {
            if (controller.signal.aborted) {
              throw new ProviderError(null, 'Provider deadline exceeded');
            }
            throw new ProviderError(null, 'Provider returned invalid JSON');
          }
          if (this.clock().getTime() > deadline) {
            throw new ProviderError(null, 'Provider deadline exceeded');
          }
          return value;
        })(),
        expired,
      ]);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(null, 'Provider request failed');
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
}
