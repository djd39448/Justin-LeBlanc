/**
 * Implements isolated Google Calendar free/busy, event writes, and show reconciliation reads.
 *
 * Dependencies: server Config, durable Store records, shared schemas, and Google OAuth HTTP APIs.
 * Depended on by: booking availability, outbox workers, and the post-show morning scan.
 * Why this exists: provider IDs and OAuth stay outside domain logic and family calendar resources.
 */
import { createHash } from 'node:crypto';

import { z } from 'zod';

import {
  CalendarLinkSchema,
  ConsultationSchema,
  CustomerSchema,
  QuoteSchema,
  ShowSchema,
  TENANT,
  type Quote,
  type Show,
} from '../../../packages/contracts/index.js';
import type { BusyInterval } from '../../../packages/domain/booking.js';
import type { Config } from '../config.js';
import { type Effect, Store } from '../store.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const MAX_EVENT_PAGES = 20;

export const CalendarUpsertEffectSchema = z.object({
  version: z.literal(1),
  showId: z.string(),
  role: z.enum(['consultation', 'performance']),
  reason: z.string().min(1).max(100),
});
export const CalendarCancelEffectSchema = CalendarUpsertEffectSchema.extend({
  reason: z.string().min(1).max(100),
});

const TokenResponseSchema = z.object({ access_token: z.string().min(1), expires_in: z.number() });
const FreeBusyResponseSchema = z.object({
  calendars: z.record(
    z.string(),
    z.object({
      busy: z.array(z.object({ start: z.string(), end: z.string() })).default([]),
      errors: z.array(z.object({ reason: z.string().optional() })).optional(),
    }),
  ),
});
const GoogleEventTimeSchema = z.object({
  dateTime: z.string().optional(),
  date: z.string().optional(),
  timeZone: z.string().optional(),
});
const GoogleEventSchema = z.object({
  id: z.string(),
  etag: z.string().default(''),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).default('confirmed'),
  start: GoogleEventTimeSchema.optional(),
  end: GoogleEventTimeSchema.optional(),
  recurringEventId: z.string().optional(),
  originalStartTime: GoogleEventTimeSchema.optional(),
  attendees: z.array(z.object({ email: z.string() }).passthrough()).default([]),
  extendedProperties: z.object({ private: z.record(z.string(), z.string()).optional() }).optional(),
});
const EventListSchema = z.object({
  items: z.array(GoogleEventSchema).default([]),
  nextPageToken: z.string().optional(),
});

export type CalendarEventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type CalendarEventTime =
  { kind: 'dateTime'; dateTime: string; timeZone?: string } | { kind: 'allDay'; date: string };
export interface CalendarShowMetadata {
  tenantId: string;
  showId: string;
  customerId: string;
  quoteVersion: number;
  currency: 'USD';
  agreedTotalCents: number;
}
export interface CalendarShowEvent {
  eventId: string;
  status: CalendarEventStatus;
  start: CalendarEventTime;
  end: CalendarEventTime;
  recurringEventId: string | null;
  originalStart: string | null;
  etag: string;
  metadata: CalendarShowMetadata | null;
}

interface CalendarEventDraft {
  summary: string;
  description: string;
  status: 'confirmed' | 'tentative';
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees: { email: string }[];
  extendedProperties: { private: Record<string, string> };
}

interface ProviderEventReceipt {
  eventId: string;
  etag: string;
}

const deterministicEventId = (showId: string, role: 'consultation' | 'performance'): string =>
  createHash('sha256').update(`${TENANT}:${showId}:${role}`, 'utf8').digest('hex').slice(0, 32);

function configuredCalendarIds(config: Config): string[] {
  const values = [config.SHOW_CALENDAR_ID, ...config.FREE_BUSY_CALENDAR_IDS.split(',')]
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return [...new Set(values)];
}

function parseEventTime(
  value: z.infer<typeof GoogleEventTimeSchema> | undefined,
  eventId: string,
): CalendarEventTime {
  if (value === undefined) {
    throw new Error(`Google event ${eventId} has no usable instance time; inspect the event.`);
  }
  if (value.dateTime !== undefined) {
    return value.timeZone === undefined
      ? { kind: 'dateTime', dateTime: value.dateTime }
      : { kind: 'dateTime', dateTime: value.dateTime, timeZone: value.timeZone };
  }
  if (value.date !== undefined) return { kind: 'allDay', date: value.date };
  throw new Error(`Google event ${eventId} has neither dateTime nor date; inspect the event.`);
}

function parseMetadata(values: Record<string, string> | undefined): CalendarShowMetadata | null {
  if (values === undefined || values['tenantId'] !== TENANT) return null;
  const schema = z.object({
    tenantId: z.literal(TENANT),
    showId: z.string(),
    customerId: z.string(),
    quoteVersion: z.coerce.number().int().positive(),
    currency: z.literal('USD'),
    agreedTotalCents: z.coerce.number().int().nonnegative(),
  });
  const result = schema.safeParse(values);
  return result.success ? result.data : null;
}

function eventMatchesDraft(
  event: z.infer<typeof GoogleEventSchema>,
  draft: CalendarEventDraft,
): boolean {
  const sameInstant = (
    actual: z.infer<typeof GoogleEventSchema>['start'],
    expected: CalendarEventDraft['start'],
  ): boolean =>
    actual !== undefined &&
    actual.dateTime !== undefined &&
    Date.parse(actual.dateTime) === Date.parse(expected.dateTime) &&
    actual.timeZone === expected.timeZone;
  const actualAttendees = event.attendees.map((value) => value.email.toLowerCase()).sort();
  const expectedAttendees = draft.attendees.map((value) => value.email.toLowerCase()).sort();
  const actualPrivate = event.extendedProperties?.private ?? {};
  const expectedPrivate = draft.extendedProperties.private;
  return (
    event.status === draft.status &&
    sameInstant(event.start, draft.start) &&
    sameInstant(event.end, draft.end) &&
    JSON.stringify(actualAttendees) === JSON.stringify(expectedAttendees) &&
    JSON.stringify(Object.entries(actualPrivate).sort()) ===
      JSON.stringify(Object.entries(expectedPrivate).sort())
  );
}

/** Google Calendar adapter authorized only through a user OAuth refresh token. */
export class GoogleCalendarAdapter {
  constructor(
    private readonly config: Config,
    private readonly request: typeof fetch = fetch,
  ) {}

  private assertConfigured(): void {
    if (
      this.config.GOOGLE_CLIENT_ID.length === 0 ||
      this.config.GOOGLE_CLIENT_SECRET.length === 0 ||
      this.config.GOOGLE_REFRESH_TOKEN.length === 0
    ) {
      throw new Error(
        'Google Calendar user OAuth is not configured; set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.',
      );
    }
    if (this.config.SHOW_CALENDAR_ID.length === 0) {
      throw new Error('SHOW_CALENDAR_ID is empty; configure the isolated Justin demo calendar.');
    }
  }

  /** Returns merged busy intervals from only the explicitly configured calendars. */
  async busy(
    timeMin: string,
    timeMax: string,
    excludeProviderEventIds: string[] = [],
  ): Promise<BusyInterval[]> {
    this.assertConfigured();
    const ids = configuredCalendarIds(this.config).filter(
      (id) => excludeProviderEventIds.length === 0 || id !== this.config.SHOW_CALENDAR_ID,
    );
    const intervals: BusyInterval[] = [];
    if (ids.length > 0) {
      const response = await this.googleRequest('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        body: JSON.stringify({ timeMin, timeMax, items: ids.map((id) => ({ id })) }),
      });
      const result = FreeBusyResponseSchema.parse(response);
      for (const [calendarId, calendar] of Object.entries(result.calendars)) {
        if (calendar.errors !== undefined && calendar.errors.length > 0) {
          throw new Error(
            `Google free/busy failed for configured calendar ${calendarId}; verify calendar access and OAuth scopes.`,
          );
        }
        intervals.push(...calendar.busy);
      }
    }
    if (excludeProviderEventIds.length > 0) {
      const showEvents = await this.listShowEvents({ timeMin, timeMax });
      for (const event of showEvents) {
        if (excludeProviderEventIds.includes(event.eventId) || event.status === 'cancelled')
          continue;
        if (event.start.kind === 'dateTime' && event.end.kind === 'dateTime') {
          intervals.push({ start: event.start.dateTime, end: event.end.dateTime });
        } else {
          intervals.push({ start: timeMin, end: timeMax });
        }
      }
    }
    return intervals.sort((left, right) => Date.parse(left.start) - Date.parse(right.start));
  }

  /** Creates or updates an event while preserving its provider ID across state transitions. */
  async upsertEvent(
    draft: CalendarEventDraft,
    eventId: string,
    exists: boolean,
  ): Promise<ProviderEventReceipt> {
    this.assertConfigured();
    const calendar = encodeURIComponent(this.config.SHOW_CALENDAR_ID);
    const path = !exists
      ? `${GOOGLE_CALENDAR_API}/calendars/${calendar}/events?sendUpdates=all`
      : `${GOOGLE_CALENDAR_API}/calendars/${calendar}/events/${encodeURIComponent(eventId)}?sendUpdates=all`;
    const response = await this.googleRequest(path, {
      method: exists ? 'PATCH' : 'POST',
      body: JSON.stringify(exists ? draft : { id: eventId, ...draft }),
    });
    const parsed = GoogleEventSchema.pick({ id: true, etag: true }).parse(response);
    return { eventId: parsed.id, etag: parsed.etag };
  }

  /** Cancels one known event and sends provider attendee updates. */
  async cancelEvent(eventId: string): Promise<void> {
    this.assertConfigured();
    const calendar = encodeURIComponent(this.config.SHOW_CALENDAR_ID);
    await this.googleRequest(
      `${GOOGLE_CALENDAR_API}/calendars/${calendar}/events/${encodeURIComponent(eventId)}?sendUpdates=all`,
      { method: 'DELETE' },
      true,
    );
  }

  /**
   * Lists isolated show-calendar events for post-show reconciliation.
   * All-day and malformed/non-demo metadata remain explicit so callers can queue review.
   */
  async listShowEvents(input: { timeMin: string; timeMax: string }): Promise<CalendarShowEvent[]> {
    this.assertConfigured();
    const calendar = encodeURIComponent(this.config.SHOW_CALENDAR_ID);
    const events: CalendarShowEvent[] = [];
    let pageToken: string | undefined;
    for (let page = 0; page < MAX_EVENT_PAGES; page += 1) {
      const query = new URLSearchParams({
        timeMin: input.timeMin,
        timeMax: input.timeMax,
        singleEvents: 'true',
        showDeleted: 'true',
        maxResults: '2500',
      });
      if (pageToken !== undefined) query.set('pageToken', pageToken);
      const raw = await this.googleRequest(
        `${GOOGLE_CALENDAR_API}/calendars/${calendar}/events?${query.toString()}`,
        { method: 'GET' },
      );
      const result = EventListSchema.parse(raw);
      for (const event of result.items) {
        const original = event.originalStartTime?.dateTime ?? event.originalStartTime?.date ?? null;
        const cancelledFallback =
          event.status === 'cancelled' ? event.originalStartTime : undefined;
        events.push({
          eventId: event.id,
          status: event.status,
          start: parseEventTime(event.start ?? cancelledFallback, event.id),
          end: parseEventTime(event.end ?? cancelledFallback, event.id),
          recurringEventId: event.recurringEventId ?? null,
          originalStart: original,
          etag: event.etag,
          metadata: parseMetadata(event.extendedProperties?.private),
        });
      }
      pageToken = result.nextPageToken;
      if (pageToken === undefined) return events;
    }
    throw new Error(
      `Google event listing exceeded ${MAX_EVENT_PAGES} pages; narrow the reconciliation window.`,
    );
  }

  /** Retrieves an exact event for uncertain-write reconciliation; 404 is an explicit miss. */
  async findEvent(eventId: string): Promise<z.infer<typeof GoogleEventSchema> | null> {
    this.assertConfigured();
    const accessToken = await this.accessToken();
    const calendar = encodeURIComponent(this.config.SHOW_CALENDAR_ID);
    const response = await this.request(
      `${GOOGLE_CALENDAR_API}/calendars/${calendar}/events/${encodeURIComponent(eventId)}`,
      { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `Google Calendar reconciliation failed with HTTP ${response.status}; verify OAuth and reconcile again without resending.`,
      );
    }
    return GoogleEventSchema.parse(await response.json());
  }

  private async googleRequest(
    url: string,
    init: RequestInit,
    allowEmpty = false,
  ): Promise<unknown> {
    const accessToken = await this.accessToken();
    const response = await this.request(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Google Calendar ${init.method ?? 'GET'} failed with HTTP ${response.status}; verify OAuth scopes, calendar ID, and provider logs.`,
      );
    }
    if (allowEmpty || response.status === 204) return {};
    return response.json();
  }

  private async accessToken(): Promise<string> {
    this.assertConfigured();
    const body = new URLSearchParams({
      client_id: this.config.GOOGLE_CLIENT_ID,
      client_secret: this.config.GOOGLE_CLIENT_SECRET,
      refresh_token: this.config.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    const response = await this.request(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) {
      throw new Error(
        `Google OAuth refresh failed with HTTP ${response.status}; reconnect the authorized user account.`,
      );
    }
    return TokenResponseSchema.parse(await response.json()).access_token;
  }
}

/** Reloads authoritative records and dispatches one claimed calendar outbox effect. */
export class CalendarEffectDispatcher {
  constructor(
    private readonly store: Store,
    private readonly calendar: GoogleCalendarAdapter,
    private readonly config: Config,
  ) {}

  /** Sends a calendar outbox payload using a deterministic provider ID for safe reconciliation. */
  async send(kind: string, rawPayload: unknown): Promise<{ providerId: string }> {
    if (kind === 'calendar.upsert') {
      const payload = CalendarUpsertEffectSchema.parse(rawPayload);
      const show = this.store.get('shows', payload.showId, ShowSchema);
      const link = this.findLink(payload.showId, payload.role);
      const draft = this.buildDraft(show.id, show.data, payload.role);
      const eventId =
        link === undefined ? deterministicEventId(payload.showId, payload.role) : link.data.eventId;
      const receipt = await this.calendar.upsertEvent(draft, eventId, link !== undefined);
      this.store.transaction(() => {
        if (link === undefined) {
          this.store.insert('calendar_links', `calendar-${eventId}`, {
            showId: payload.showId,
            role: payload.role,
            eventId: receipt.eventId,
            calendarId: this.config.SHOW_CALENDAR_ID,
            etag: receipt.etag,
            syncState: 'synced',
          });
        } else {
          this.store.update('calendar_links', link.id, link.revision, {
            ...link.data,
            eventId: receipt.eventId,
            etag: receipt.etag,
            syncState: 'synced',
          });
        }
      });
      return { providerId: receipt.eventId };
    }
    if (kind === 'calendar.cancel') {
      const payload = CalendarCancelEffectSchema.parse(rawPayload);
      const link = this.findLink(payload.showId, payload.role);
      const eventId =
        link === undefined ? deterministicEventId(payload.showId, payload.role) : link.data.eventId;
      await this.calendar.cancelEvent(eventId);
      return { providerId: eventId };
    }
    throw new Error(`Calendar dispatcher cannot handle effect kind ${kind}.`);
  }

  /** Reconciles an uncertain write by exact deterministic ID and private ownership metadata. */
  async reconcile(
    kind: string,
    rawPayload: unknown,
  ): Promise<{
    status: 'accepted' | 'not_found' | 'uncertain';
    providerId: string | null;
  }> {
    const payload =
      kind === 'calendar.upsert'
        ? CalendarUpsertEffectSchema.parse(rawPayload)
        : CalendarCancelEffectSchema.parse(rawPayload);
    if (kind !== 'calendar.upsert' && kind !== 'calendar.cancel') {
      throw new Error(`Calendar dispatcher cannot reconcile effect kind ${kind}.`);
    }
    const link = this.findLink(payload.showId, payload.role);
    const eventId =
      link === undefined ? deterministicEventId(payload.showId, payload.role) : link.data.eventId;
    const event = await this.calendar.findEvent(eventId);
    if (event === null) {
      return kind === 'calendar.cancel'
        ? { status: 'accepted', providerId: eventId }
        : { status: 'not_found', providerId: null };
    }
    const privateData = event.extendedProperties?.private;
    if (
      privateData === undefined ||
      privateData['tenantId'] !== TENANT ||
      privateData['showId'] !== payload.showId ||
      privateData['role'] !== payload.role
    ) {
      return { status: 'uncertain', providerId: eventId };
    }
    if (kind === 'calendar.cancel' && event.status !== 'cancelled') {
      return { status: 'uncertain', providerId: eventId };
    }
    if (kind === 'calendar.upsert') {
      const show = this.store.get('shows', payload.showId, ShowSchema);
      const draft = this.buildDraft(show.id, show.data, payload.role);
      if (!eventMatchesDraft(event, draft)) {
        return { status: 'uncertain', providerId: eventId };
      }
      this.store.transaction(() => {
        const current = this.findLink(payload.showId, payload.role);
        if (current === undefined) {
          this.store.insert('calendar_links', `calendar-${eventId}`, {
            showId: payload.showId,
            role: payload.role,
            eventId,
            calendarId: this.config.SHOW_CALENDAR_ID,
            etag: event.etag,
            syncState: 'synced',
          });
        } else {
          this.store.update('calendar_links', current.id, current.revision, {
            ...current.data,
            eventId,
            etag: event.etag,
            syncState: 'synced',
          });
        }
      });
    }
    return { status: 'accepted', providerId: eventId };
  }

  /** Compatibility helper for direct tests; outbox workers should use send/reconcile. */
  async dispatch(effect: Effect): Promise<string | null> {
    const result = await this.send(effect.kind, JSON.parse(effect.payload));
    return result.providerId;
  }

  private findLink(showId: string, role: 'consultation' | 'performance') {
    return this.store
      .all('calendar_links', CalendarLinkSchema)
      .find((link) => link.data.showId === showId && link.data.role === role);
  }

  private buildDraft(
    showId: string,
    show: Show,
    role: 'consultation' | 'performance',
  ): CalendarEventDraft {
    const customer = this.store.get('customers', show.customerId, CustomerSchema).data;
    const attendees = [
      ...new Set([customer.email, this.config.OPERATOR_EMAIL].map((v) => v.toLowerCase())),
    ].map((email) => ({ email }));
    if (role === 'consultation') {
      const consultation = this.store.get(
        'consultations',
        show.consultationId,
        ConsultationSchema,
      ).data;
      return {
        summary: '[DEMO][CONSULTATION] Justin LeBlanc event planning',
        description: `Private-event planning consultation. Booking reference: ${show.inquiryId}.`,
        status: 'confirmed',
        start: { dateTime: consultation.start, timeZone: consultation.timezone },
        end: { dateTime: consultation.end, timeZone: consultation.timezone },
        attendees,
        extendedProperties: {
          private: { tenantId: TENANT, showId: consultation.showId, role: 'consultation' },
        },
      };
    }

    const quote =
      show.quoteId === null ? undefined : this.store.get('quotes', show.quoteId, QuoteSchema).data;
    const privateProperties: Record<string, string> = {
      tenantId: TENANT,
      showId,
      customerId: show.customerId,
      role: 'performance',
    };
    if (quote !== undefined) this.addQuoteMetadata(privateProperties, quote);
    const label = show.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE';
    return {
      summary: `[DEMO][${label}] Justin LeBlanc — ${show.eventType}`,
      description: `${show.eventType} in ${show.city}. This demo hold is governed by the booking record; internal financial notes are omitted.`,
      status: show.status === 'confirmed' ? 'confirmed' : 'tentative',
      start: { dateTime: show.start, timeZone: show.timezone },
      end: { dateTime: show.end, timeZone: show.timezone },
      attendees,
      extendedProperties: { private: privateProperties },
    };
  }

  private addQuoteMetadata(target: Record<string, string>, quote: Quote): void {
    if (quote.kind !== 'agreed') return;
    target['quoteVersion'] = String(quote.version);
    target['currency'] = quote.currency;
    target['agreedTotalCents'] = String(quote.totalCents);
  }
}
