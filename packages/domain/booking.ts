/**
 * Owns inquiry identity, availability, holds, and authorized booking state transitions.
 *
 * Dependencies: crypto, shared contracts, time helpers, and the durable Store abstraction.
 * Depended on by: HTTP routes, chat/voice tools, operator CLI, and expiry jobs.
 * Why this exists: every channel must use the same transaction and authorization rules.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import { MailEffectSchema } from '../../apps/api/adapters/email.js';
import { Store } from '../../apps/api/store.js';
import {
  ConsultationSchema,
  CalendarLinkSchema,
  CustomerSchema,
  InquiryInputSchema,
  InquirySchema,
  InstantSchema,
  LineItemSchema,
  POLICY_VERSION,
  QuoteSchema,
  ScheduleInputSchema,
  ShowSchema,
  type Customer,
  type Entity,
  type Inquiry,
  type InquiryInput,
  type Quote,
  type Show,
} from '../contracts/index.js';

import { bufferedIntervalsOverlap } from './time.js';

const ACTIVE_SHOW_STATUSES = new Set<Show['status']>([
  'tentative',
  'confirmed',
  'awaiting_performance_reply',
]);
const CONSULTATION_MINUTES = 20;
const CONSULTATION_TIME_ZONE = 'America/Chicago';
const DEFAULT_BUFFER_BEFORE_MINUTES = 120;
const DEFAULT_BUFFER_AFTER_MINUTES = 90;

const ProcessedScheduleSchema = z.object({
  kind: z.literal('booking_schedule'),
  requestKey: z.string(),
  inquiryId: z.string(),
  showId: z.string(),
  consultationId: z.string(),
});
const ProcessedQuoteSchema = z.object({
  kind: z.literal('agreed_quote'),
  requestKey: z.string(),
  showId: z.string(),
  quoteId: z.string(),
});
const ProcessedConfirmationSchema = z.object({
  kind: z.literal('show_confirmation'),
  requestKey: z.string(),
  showId: z.string(),
  quoteId: z.string(),
});

export interface BusyInterval {
  start: string;
  end: string;
}

export interface AvailabilityProvider {
  /** Returns only occupied intervals for configured calendars; no private event details. */
  busy(
    timeMin: string,
    timeMax: string,
    excludeProviderEventIds?: string[],
  ): Promise<BusyInterval[]>;
}

export interface BookingRecipients {
  operatorEmail: string;
  performerEmail: string;
  senderEmail?: string;
  replyToEmail?: string;
}

export interface UpsertInquiryRequest {
  input: InquiryInput;
  inquiryId?: string;
  resumeToken?: string;
}

export interface InquiryReceipt {
  inquiryId: string;
  resumeToken: string;
  status: Inquiry['status'];
}

export interface AvailabilityRequest {
  consultationStart: string;
  performanceStart: string;
  performanceEnd: string;
  excludeShowId?: string;
  excludeProviderEventIds?: string[];
  now?: string;
}

export interface AvailabilityResult {
  consultationAvailable: boolean;
  performanceAvailable: boolean;
  reasons: string[];
}

export interface ScheduleReceipt {
  inquiryId: string;
  showId: string;
  consultationId: string;
  status: Show['status'];
  replayed: boolean;
}

export interface ConfirmShowRequest {
  showId: string;
  showRevision: number;
  quoteId: string;
  quoteRevision: number;
  actor: string;
  requestKey: string;
}

export interface AgreedQuoteRequest {
  showId: string;
  lines: z.input<typeof QuoteSchema>['lines'];
  depositCents?: number;
  actor: string;
  requestKey: string;
}

export interface InquiryInspection {
  inquiryId: string;
  status: Inquiry['status'];
  input: InquiryInput;
  shows: {
    id: string;
    status: Show['status'];
    start: string;
    end: string;
    timezone: string;
    holdExpiresAt: string;
  }[];
}

export interface RescheduleShowRequest {
  showId: string;
  showRevision: number;
  actor: string;
  performanceStart: string;
  performanceEnd: string;
  consultationStart?: string;
  resumeToken?: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function assertInquiryToken(inquiry: Entity<Inquiry>, token: string): void {
  if (!tokenMatches(token, inquiry.data.tokenHash)) {
    throw new Error(
      `Inquiry authorization failed for ${inquiry.id}; use the resume link issued for this inquiry.`,
    );
  }
}

function consultationPolicyReason(start: string, now: string): string | undefined {
  const startMs = Date.parse(InstantSchema.parse(start));
  if (startMs <= Date.parse(InstantSchema.parse(now))) {
    return 'Consultations must start in the future.';
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CONSULTATION_TIME_ZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(startMs));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const weekday = values.get('weekday');
  const hour = Number(values.get('hour'));
  const minute = Number(values.get('minute'));
  if (weekday === undefined || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('Unable to evaluate consultation hours; verify host ICU timezone data.');
  }
  if (weekday === 'Sat' || weekday === 'Sun' || hour < 10 || hour * 60 + minute > 15 * 60 + 40) {
    return `Consultations are offered Monday-Friday, 10:00-16:00 ${CONSULTATION_TIME_ZONE}.`;
  }
  return undefined;
}

function overlapsBusy(start: string, end: string, intervals: BusyInterval[]): boolean {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  return intervals.some(
    (interval) => startMs < Date.parse(interval.end) && Date.parse(interval.start) < endMs,
  );
}

/** Shared booking service used by public, assistant, operator, and job entry points. */
export class BookingService {
  constructor(
    private readonly store: Store,
    private readonly availabilityProvider: AvailabilityProvider,
    private readonly recipients: BookingRecipients,
    private readonly authorizeSchedule?: (inquiry: Inquiry) => void,
  ) {}

  /**
   * Creates an inquiry and opaque resume token, or updates the token-authorized existing inquiry.
   * Returns only the scoped receipt; customer data remains server-side.
   */
  upsertInquiry(request: UpsertInquiryRequest): InquiryReceipt {
    const input = InquiryInputSchema.parse(request.input);
    if (request.inquiryId !== undefined || request.resumeToken !== undefined) {
      if (request.inquiryId === undefined || request.resumeToken === undefined) {
        throw new Error('Both inquiryId and resumeToken are required to resume an inquiry.');
      }
      return this.store.transaction(() => {
        const inquiryId = request.inquiryId;
        const resumeToken = request.resumeToken;
        if (inquiryId === undefined || resumeToken === undefined) {
          throw new Error('Resume credentials disappeared after validation; retry the request.');
        }
        const inquiry = this.store.get('inquiries', inquiryId, InquirySchema);
        assertInquiryToken(inquiry, resumeToken);
        const customer = this.store.get('customers', inquiry.data.customerId, CustomerSchema);
        const nextCustomer: Customer = {
          ...customer.data,
          name: input.name,
          email: input.email,
          phone: input.phone,
          company: input.company,
        };
        this.store.update('customers', customer.id, customer.revision, nextCustomer);
        const updated = this.store.update('inquiries', inquiry.id, inquiry.revision, {
          ...inquiry.data,
          input,
        });
        this.store.audit('public_token', 'inquiry.updated', inquiry.id, {
          source: input.source,
          revision: updated.revision,
        });
        return {
          inquiryId: inquiry.id,
          resumeToken,
          status: updated.data.status,
        };
      });
    }

    const resumeToken = randomBytes(32).toString('base64url');
    return this.store.transaction(() => {
      const customerId = randomUUID();
      const inquiryId = randomUUID();
      this.store.insert<Customer>('customers', customerId, {
        name: input.name,
        email: input.email,
        phone: input.phone,
        company: input.company,
        billingName: '',
        billingEmail: '',
        billingAddress: '',
        poRequired: false,
        poNumber: '',
      });
      const inquiry = this.store.insert<Inquiry>('inquiries', inquiryId, {
        customerId,
        input,
        status: 'new',
        tokenHash: hashToken(resumeToken),
        followupQuestions: [],
      });
      this.store.audit('public', 'inquiry.created', inquiry.id, { source: input.source });
      return { inquiryId, resumeToken, status: inquiry.data.status };
    });
  }

  /** Checks consultation policy, configured provider free/busy, and active local holds. */
  async getAvailability(request: AvailabilityRequest): Promise<AvailabilityResult> {
    const consultationStart = InstantSchema.parse(request.consultationStart);
    const performanceStart = InstantSchema.parse(request.performanceStart);
    const performanceEnd = InstantSchema.parse(request.performanceEnd);
    const consultationEnd = new Date(
      Date.parse(consultationStart) + CONSULTATION_MINUTES * 60_000,
    ).toISOString();
    if (Date.parse(performanceEnd) <= Date.parse(performanceStart)) {
      throw new Error('Performance end must be after start; correct the requested interval.');
    }
    const now =
      request.now === undefined ? new Date().toISOString() : InstantSchema.parse(request.now);
    const reasons: string[] = [];
    const policyReason = consultationPolicyReason(consultationStart, now);
    if (policyReason !== undefined) reasons.push(policyReason);

    const min = new Date(
      Math.min(Date.parse(consultationStart), Date.parse(performanceStart)) -
        DEFAULT_BUFFER_BEFORE_MINUTES * 60_000,
    ).toISOString();
    const max = new Date(
      Math.max(Date.parse(consultationEnd), Date.parse(performanceEnd)) +
        DEFAULT_BUFFER_AFTER_MINUTES * 60_000,
    ).toISOString();
    const providerBusy = await this.availabilityProvider.busy(
      min,
      max,
      request.excludeProviderEventIds,
    );
    const consultationProviderConflict = overlapsBusy(
      consultationStart,
      consultationEnd,
      providerBusy,
    );
    const performanceProviderConflict = overlapsBusy(
      new Date(Date.parse(performanceStart) - DEFAULT_BUFFER_BEFORE_MINUTES * 60_000).toISOString(),
      new Date(Date.parse(performanceEnd) + DEFAULT_BUFFER_AFTER_MINUTES * 60_000).toISOString(),
      providerBusy,
    );
    if (consultationProviderConflict) reasons.push('The consultation interval is busy.');
    if (performanceProviderConflict) reasons.push('The performance interval or buffer is busy.');

    const consultationLocalConflict = this.store
      .all('consultations', ConsultationSchema)
      .some(
        (consultation) =>
          consultation.data.status === 'scheduled' &&
          Date.parse(consultationStart) < Date.parse(consultation.data.end) &&
          Date.parse(consultation.data.start) < Date.parse(consultationEnd),
      );
    const performanceLocalConflict = this.hasShowConflict(
      performanceStart,
      performanceEnd,
      request.excludeShowId,
    );
    if (consultationLocalConflict)
      reasons.push('Another consultation already holds that interval.');
    if (performanceLocalConflict)
      reasons.push('Another active show conflicts with the requested buffers.');
    return {
      consultationAvailable:
        policyReason === undefined && !consultationProviderConflict && !consultationLocalConflict,
      performanceAvailable: !performanceProviderConflict && !performanceLocalConflict,
      reasons,
    };
  }

  /** Atomically creates one consultation and one buffered tentative hold after a final recheck. */
  async scheduleConsultationAndHold(
    rawInput: z.input<typeof ScheduleInputSchema>,
  ): Promise<ScheduleReceipt> {
    const input = ScheduleInputSchema.parse(rawInput);
    const currentInquiry = this.store.get('inquiries', input.inquiryId, InquirySchema);
    assertInquiryToken(currentInquiry, input.token);
    this.authorizeSchedule?.(currentInquiry.data);
    const availability = await this.getAvailability({
      consultationStart: input.consultationStart,
      performanceStart: input.performanceStart,
      performanceEnd: input.performanceEnd,
    });
    if (!availability.consultationAvailable || !availability.performanceAvailable) {
      throw new Error(`Requested schedule is unavailable: ${availability.reasons.join(' ')}`);
    }

    return this.store.transaction(() => {
      const inquiry = this.store.get('inquiries', input.inquiryId, InquirySchema);
      assertInquiryToken(inquiry, input.token);
      this.authorizeSchedule?.(inquiry.data);
      const processedId = `booking:${input.requestKey}`;
      const prior = this.store.find('processed_events', processedId, ProcessedScheduleSchema);
      if (prior !== undefined) {
        if (prior.data.inquiryId !== input.inquiryId) {
          throw new Error('Request key belongs to another inquiry; generate a new request key.');
        }
        return {
          inquiryId: prior.data.inquiryId,
          showId: prior.data.showId,
          consultationId: prior.data.consultationId,
          status: this.store.get('shows', prior.data.showId, ShowSchema).data.status,
          replayed: true,
        };
      }
      if (inquiry.data.status === 'consultation_completed') {
        throw new Error(
          'This inquiry has completed consultation; an operator must create another hold.',
        );
      }
      if (this.hasShowConflict(input.performanceStart, input.performanceEnd)) {
        throw new Error(
          'Performance hold lost a race; refresh availability and choose another time.',
        );
      }
      const consultationEnd = new Date(
        Date.parse(input.consultationStart) + CONSULTATION_MINUTES * 60_000,
      ).toISOString();
      if (this.hasConsultationConflict(input.consultationStart, consultationEnd)) {
        throw new Error(
          'Consultation slot lost a race; refresh availability and choose another time.',
        );
      }

      const consultationId = randomUUID();
      const showId = randomUUID();
      const holdExpiresAt = new Date(Date.parse(consultationEnd) + 48 * 60 * 60_000).toISOString();
      this.store.insert('consultations', consultationId, {
        inquiryId: inquiry.id,
        showId,
        start: input.consultationStart,
        end: consultationEnd,
        timezone: input.timezone,
        status: 'scheduled',
      });
      const show = this.store.insert<Show>('shows', showId, {
        inquiryId: inquiry.id,
        customerId: inquiry.data.customerId,
        eventType: inquiry.data.input.eventType,
        venue: inquiry.data.input.venue,
        city: inquiry.data.input.city,
        start: input.performanceStart,
        end: input.performanceEnd,
        timezone: input.timezone,
        bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
        bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
        status: 'tentative',
        holdExpiresAt,
        quoteId: null,
        consultationId,
        synthetic: false,
      });
      this.store.update('inquiries', inquiry.id, inquiry.revision, {
        ...inquiry.data,
        status: 'consultation_scheduled',
      });
      this.store.insert('processed_events', processedId, {
        kind: 'booking_schedule',
        requestKey: input.requestKey,
        inquiryId: inquiry.id,
        showId,
        consultationId,
      });
      this.enqueueCalendar(showId, 'consultation', 'initial_schedule');
      this.enqueueCalendar(showId, 'performance', 'initial_hold');
      this.enqueueBookingEmail(show, 'tentative_hold_created');
      this.store.enqueue(`document:event-brief:${showId}:1`, 'document.event_brief', showId, {
        version: 1,
        showId,
      });
      this.store.audit('public_token', 'booking.hold_created', showId, {
        inquiryId: inquiry.id,
        requestKey: input.requestKey,
      });
      return {
        inquiryId: inquiry.id,
        showId,
        consultationId,
        status: show.data.status,
        replayed: false,
      };
    });
  }

  /** Marks a consultation completed; only an authenticated operator should call this method. */
  completeConsultation(consultationId: string, revision: number, actor: string): void {
    this.store.transaction(() => {
      const consultation = this.store.get('consultations', consultationId, ConsultationSchema);
      if (consultation.revision !== revision)
        throw new Error('Consultation revision is stale; refresh it.');
      if (consultation.data.status !== 'scheduled') {
        throw new Error(
          `Consultation is ${consultation.data.status}; only scheduled records can complete.`,
        );
      }
      this.store.update('consultations', consultation.id, revision, {
        ...consultation.data,
        status: 'completed',
      });
      const inquiry = this.store.get('inquiries', consultation.data.inquiryId, InquirySchema);
      this.store.update('inquiries', inquiry.id, inquiry.revision, {
        ...inquiry.data,
        status: 'consultation_completed',
      });
      this.store.audit(actor, 'consultation.completed', consultation.id, {});
    });
  }

  /** Returns only the token-authorized inquiry and its own safe show summaries. */
  inspectInquiry(inquiryId: string, resumeToken: string): InquiryInspection {
    const inquiry = this.store.get('inquiries', inquiryId, InquirySchema);
    assertInquiryToken(inquiry, resumeToken);
    return {
      inquiryId: inquiry.id,
      status: inquiry.data.status,
      input: inquiry.data.input,
      shows: this.store
        .all('shows', ShowSchema)
        .filter((show) => show.data.inquiryId === inquiry.id)
        .map((show) => ({
          id: show.id,
          status: show.data.status,
          start: show.data.start,
          end: show.data.end,
          timezone: show.data.timezone,
          holdExpiresAt: show.data.holdExpiresAt,
        })),
    };
  }

  /** Records an unanswered public question against only the token-authorized inquiry. */
  requestHumanFollowup(
    inquiryId: string,
    resumeToken: string,
    question: string,
    channel: 'chat' | 'voice',
  ): { inquiryId: string; status: 'captured' } {
    const boundedQuestion = z.string().trim().min(1).max(800).parse(question);
    return this.store.transaction(() => {
      const inquiry = this.store.get('inquiries', inquiryId, InquirySchema);
      assertInquiryToken(inquiry, resumeToken);
      const duplicate = inquiry.data.followupQuestions.includes(boundedQuestion);
      if (!duplicate) {
        this.store.update('inquiries', inquiry.id, inquiry.revision, {
          ...inquiry.data,
          followupQuestions: [...inquiry.data.followupQuestions, boundedQuestion],
        });
      }
      this.store.audit(`assistant:${channel}`, 'inquiry.followup_requested', inquiry.id, {
        duplicate,
      });
      return { inquiryId: inquiry.id, status: 'captured' };
    });
  }

  /** Creates a new immutable operator-approved agreed quote version using exact integer totals. */
  approveAgreedQuote(request: AgreedQuoteRequest): Entity<Quote> {
    return this.store.transaction(() => {
      const processedId = `quote:${request.requestKey}`;
      const prior = this.store.find('processed_events', processedId, ProcessedQuoteSchema);
      if (prior !== undefined) {
        if (prior.data.showId !== request.showId) {
          throw new Error('Quote request key belongs to another show; use a new request key.');
        }
        return this.store.get('quotes', prior.data.quoteId, QuoteSchema);
      }
      const show = this.store.get('shows', request.showId, ShowSchema);
      if (show.data.status !== 'tentative' && show.data.status !== 'confirmed') {
        throw new Error(`Show is ${show.data.status}; agreed pricing cannot be changed.`);
      }
      const existing = this.store
        .all('quotes', QuoteSchema)
        .filter((quote) => quote.data.showId === show.id);
      const version =
        existing.reduce((highest, quote) => Math.max(highest, quote.data.version), 0) + 1;
      const lines = z.array(LineItemSchema).min(1).max(30).parse(request.lines);
      const subtotalCents = lines.reduce(
        (total, line) => total + line.quantity * line.unitCents,
        0,
      );
      const depositCents = z
        .number()
        .int()
        .min(0)
        .max(subtotalCents)
        .parse(request.depositCents ?? 0);
      const quote = QuoteSchema.parse({
        showId: show.id,
        version,
        kind: 'agreed',
        currency: 'USD',
        lines,
        subtotalCents,
        taxCents: 0,
        depositCents,
        totalCents: subtotalCents,
        policyVersion: POLICY_VERSION,
        approvedBy: request.actor,
        approvedAt: new Date().toISOString(),
      });
      const created = this.store.insert<Quote>('quotes', randomUUID(), quote);
      this.store.insert('processed_events', processedId, {
        kind: 'agreed_quote',
        requestKey: request.requestKey,
        showId: show.id,
        quoteId: created.id,
      });
      if (show.data.status === 'confirmed') {
        this.store.update('shows', show.id, show.revision, {
          ...show.data,
          quoteId: created.id,
        });
        this.enqueueCalendar(show.id, 'performance', `quote_amendment_v${version}`);
      }
      this.store.audit(request.actor, 'quote.agreed_created', created.id, {
        showId: show.id,
        version,
        requestKey: request.requestKey,
        totalCents: quote.totalCents,
      });
      return created;
    });
  }

  /** Confirms the existing hold only after live free/busy, consultation, and quote checks. */
  async confirmShow(request: ConfirmShowRequest): Promise<Entity<Show>> {
    const processedId = `confirmation:${request.requestKey}`;
    const prior = this.store.find('processed_events', processedId, ProcessedConfirmationSchema);
    if (prior !== undefined) {
      if (prior.data.showId !== request.showId || prior.data.quoteId !== request.quoteId) {
        throw new Error('Confirmation request key belongs to another show or quote.');
      }
      return this.store.get('shows', prior.data.showId, ShowSchema);
    }
    const initial = this.store.get('shows', request.showId, ShowSchema);
    const performanceLink = this.store
      .all('calendar_links', CalendarLinkSchema)
      .find((link) => link.data.showId === initial.id && link.data.role === 'performance');
    const excludeProviderEventIds =
      performanceLink === undefined ? undefined : [performanceLink.data.eventId];
    const busy = await this.availabilityProvider.busy(
      new Date(
        Date.parse(initial.data.start) - initial.data.bufferBeforeMinutes * 60_000,
      ).toISOString(),
      new Date(
        Date.parse(initial.data.end) + initial.data.bufferAfterMinutes * 60_000,
      ).toISOString(),
      excludeProviderEventIds,
    );
    if (
      overlapsBusy(
        new Date(
          Date.parse(initial.data.start) - initial.data.bufferBeforeMinutes * 60_000,
        ).toISOString(),
        new Date(
          Date.parse(initial.data.end) + initial.data.bufferAfterMinutes * 60_000,
        ).toISOString(),
        busy,
      )
    ) {
      throw new Error(
        'Live calendar availability changed; resolve the conflict before confirmation.',
      );
    }
    return this.store.transaction(() => {
      const show = this.store.get('shows', request.showId, ShowSchema);
      if (show.revision !== request.showRevision)
        throw new Error('Show revision is stale; refresh it.');
      if (show.data.status !== 'tentative') {
        throw new Error(`Show is ${show.data.status}; only a tentative hold can be confirmed.`);
      }
      if (this.hasShowConflict(show.data.start, show.data.end, show.id)) {
        throw new Error('Another local hold now conflicts; resolve it before confirmation.');
      }
      const consultation = this.store.get(
        'consultations',
        show.data.consultationId,
        ConsultationSchema,
      );
      if (consultation.data.status !== 'completed') {
        throw new Error('Consultation must be completed before confirmation.');
      }
      const quote = this.store.get('quotes', request.quoteId, QuoteSchema);
      this.assertApprovedQuote(quote, show.id, request.quoteRevision);
      const nextShow: Show = {
        ...show.data,
        status: 'confirmed',
        quoteId: quote.id,
      };
      const updated = this.store.update('shows', show.id, show.revision, nextShow);
      this.store.insert('processed_events', processedId, {
        kind: 'show_confirmation',
        requestKey: request.requestKey,
        showId: show.id,
        quoteId: quote.id,
      });
      this.enqueueCalendar(show.id, 'performance', 'operator_confirmation');
      this.enqueueBookingEmail(updated, 'operator_confirmation');
      this.store.audit(request.actor, 'show.confirmed', show.id, {
        quoteId: quote.id,
        quoteVersion: quote.data.version,
        requestKey: request.requestKey,
      });
      return updated;
    });
  }

  /** Cancels only the addressed show after either token ownership or authenticated operator scope. */
  cancelShow(showId: string, revision: number, actor: string, resumeToken?: string): Entity<Show> {
    return this.store.transaction(() => {
      const show = this.store.get('shows', showId, ShowSchema);
      if (show.revision !== revision) throw new Error('Show revision is stale; refresh it.');
      if (resumeToken !== undefined) {
        assertInquiryToken(
          this.store.get('inquiries', show.data.inquiryId, InquirySchema),
          resumeToken,
        );
      }
      if (show.data.status !== 'tentative' && show.data.status !== 'confirmed') {
        throw new Error(`Show is ${show.data.status}; it cannot be cancelled from this state.`);
      }
      const nextShow: Show = {
        ...show.data,
        status: 'cancelled',
      };
      const updated = this.store.update('shows', show.id, show.revision, nextShow);
      this.store.enqueue(`calendar:cancel:${show.id}:performance`, 'calendar.cancel', show.id, {
        version: 1,
        showId: show.id,
        role: 'performance',
        reason: 'show_cancelled',
      });
      this.enqueueBookingEmail(updated, 'show_cancelled');
      this.store.audit(actor, 'show.cancelled', show.id, { priorStatus: show.data.status });
      return updated;
    });
  }

  /** Rechecks availability then moves the same show and optional consultation records. */
  async rescheduleShow(request: RescheduleShowRequest): Promise<Entity<Show>> {
    const show = this.store.get('shows', request.showId, ShowSchema);
    if (request.resumeToken !== undefined) {
      assertInquiryToken(
        this.store.get('inquiries', show.data.inquiryId, InquirySchema),
        request.resumeToken,
      );
    }
    const consultation = this.store.get(
      'consultations',
      show.data.consultationId,
      ConsultationSchema,
    );
    const consultationStart = request.consultationStart ?? consultation.data.start;
    const providerEventIds = this.store
      .all('calendar_links', CalendarLinkSchema)
      .filter(
        (link) =>
          link.data.showId === show.id &&
          (link.data.role === 'performance' ||
            (request.consultationStart !== undefined && link.data.role === 'consultation')),
      )
      .map((link) => link.data.eventId);
    const availability = await this.getAvailability({
      consultationStart,
      performanceStart: request.performanceStart,
      performanceEnd: request.performanceEnd,
      excludeShowId: show.id,
      excludeProviderEventIds: providerEventIds,
    });
    const consultationChanged = request.consultationStart !== undefined;
    if (
      !availability.performanceAvailable ||
      (consultationChanged && !availability.consultationAvailable)
    ) {
      throw new Error(`Requested reschedule is unavailable: ${availability.reasons.join(' ')}`);
    }
    return this.store.transaction(() => {
      const current = this.store.get('shows', request.showId, ShowSchema);
      if (current.revision !== request.showRevision)
        throw new Error('Show revision is stale; refresh it.');
      if (current.data.status !== 'tentative' && current.data.status !== 'confirmed') {
        throw new Error(`Show is ${current.data.status}; it cannot be rescheduled.`);
      }
      if (this.hasShowConflict(request.performanceStart, request.performanceEnd, current.id)) {
        throw new Error('Reschedule lost a race; refresh availability and choose another time.');
      }
      const updated = this.store.update('shows', current.id, current.revision, {
        ...current.data,
        start: InstantSchema.parse(request.performanceStart),
        end: InstantSchema.parse(request.performanceEnd),
      });
      if (request.consultationStart !== undefined) {
        const currentConsultation = this.store.get(
          'consultations',
          current.data.consultationId,
          ConsultationSchema,
        );
        const end = new Date(
          Date.parse(InstantSchema.parse(request.consultationStart)) +
            CONSULTATION_MINUTES * 60_000,
        ).toISOString();
        if (this.hasConsultationConflict(request.consultationStart, end, currentConsultation.id)) {
          throw new Error('Consultation reschedule lost a race; choose another slot.');
        }
        this.store.update('consultations', currentConsultation.id, currentConsultation.revision, {
          ...currentConsultation.data,
          start: request.consultationStart,
          end,
        });
        this.enqueueCalendar(current.id, 'consultation', 'reschedule');
      }
      this.enqueueCalendar(current.id, 'performance', 'reschedule');
      this.enqueueBookingEmail(updated, 'reschedule');
      this.store.audit(request.actor, 'show.rescheduled', current.id, {
        revision: updated.revision,
        consultationChanged,
      });
      return updated;
    });
  }

  /** Expires eligible tentative holds and queues cancellation of only their performance events. */
  expireHolds(now = new Date().toISOString()): string[] {
    const instant = InstantSchema.parse(now);
    return this.store.transaction(() => {
      const expiredIds: string[] = [];
      for (const show of this.store.all('shows', ShowSchema)) {
        if (
          show.data.status !== 'tentative' ||
          Date.parse(show.data.holdExpiresAt) > Date.parse(instant)
        ) {
          continue;
        }
        this.store.update('shows', show.id, show.revision, { ...show.data, status: 'expired' });
        this.store.enqueue(`calendar:cancel:${show.id}:performance`, 'calendar.cancel', show.id, {
          version: 1,
          showId: show.id,
          role: 'performance',
          reason: 'hold_expired',
        });
        this.store.audit('job:expire_holds', 'show.expired', show.id, { asOf: instant });
        expiredIds.push(show.id);
      }
      return expiredIds;
    });
  }

  private hasShowConflict(start: string, end: string, excludeShowId?: string): boolean {
    const requested = {
      start: InstantSchema.parse(start),
      end: InstantSchema.parse(end),
      bufferBeforeMinutes: DEFAULT_BUFFER_BEFORE_MINUTES,
      bufferAfterMinutes: DEFAULT_BUFFER_AFTER_MINUTES,
    };
    return this.store
      .all('shows', ShowSchema)
      .some(
        (show) =>
          show.id !== excludeShowId &&
          ACTIVE_SHOW_STATUSES.has(show.data.status) &&
          bufferedIntervalsOverlap(requested, show.data),
      );
  }

  private hasConsultationConflict(start: string, end: string, excludeId?: string): boolean {
    const startMs = Date.parse(InstantSchema.parse(start));
    const endMs = Date.parse(InstantSchema.parse(end));
    return this.store
      .all('consultations', ConsultationSchema)
      .some(
        (consultation) =>
          consultation.id !== excludeId &&
          consultation.data.status === 'scheduled' &&
          startMs < Date.parse(consultation.data.end) &&
          Date.parse(consultation.data.start) < endMs,
      );
  }

  private assertApprovedQuote(
    quote: Entity<Quote>,
    showId: string,
    expectedRevision: number,
  ): void {
    if (quote.revision !== expectedRevision)
      throw new Error('Quote revision is stale; refresh it.');
    if (quote.data.showId !== showId) throw new Error('Quote belongs to another show.');
    if (
      quote.data.kind !== 'agreed' ||
      quote.data.approvedBy === null ||
      quote.data.approvedAt === null
    ) {
      throw new Error('An operator-approved agreed quote is required before confirmation.');
    }
  }

  private enqueueCalendar(
    showId: string,
    role: 'consultation' | 'performance',
    reason: string,
  ): void {
    this.store.enqueue(`calendar:upsert:${showId}:${role}:${reason}`, 'calendar.upsert', showId, {
      version: 1,
      showId,
      role,
      reason,
    });
  }

  private enqueueBookingEmail(
    show: Entity<Show>,
    reason: 'tentative_hold_created' | 'operator_confirmation' | 'show_cancelled' | 'reschedule',
  ): void {
    const customer = this.store.get('customers', show.data.customerId, CustomerSchema).data;
    const consultation = this.store.get(
      'consultations',
      show.data.consultationId,
      ConsultationSchema,
    ).data;
    const sender =
      this.recipients.senderEmail === undefined
        ? this.recipients.operatorEmail
        : this.recipients.senderEmail;
    const replyTo =
      this.recipients.replyToEmail === undefined
        ? this.recipients.operatorEmail
        : this.recipients.replyToEmail;
    const statusText: Record<typeof reason, string> = {
      tentative_hold_created:
        'Your consultation and tentative event hold were recorded. The performance is not confirmed until the consultation and operator-approved quote are complete.',
      operator_confirmation: 'Your performance booking has been confirmed by the demo operator.',
      show_cancelled: 'Your performance booking has been cancelled.',
      reschedule: 'Your event schedule has been updated. Please review the dates and times below.',
    };
    const subjects: Record<typeof reason, string> = {
      tentative_hold_created: '[Justin Demo] Consultation and tentative event hold',
      operator_confirmation: '[Justin Demo] Performance confirmed',
      show_cancelled: '[Justin Demo] Performance cancelled',
      reschedule: '[Justin Demo] Event schedule updated',
    };
    const text = [
      `Hello ${customer.name},`,
      '',
      statusText[reason],
      `Consultation: ${consultation.start} (${consultation.timezone})`,
      `Performance: ${show.data.start} to ${show.data.end} (${show.data.timezone})`,
      `Booking reference: ${show.id}`,
      '',
      'This is an isolated demonstration workflow.',
    ].join('\n');
    const html = `<p>Hello ${escapeHtml(customer.name)},</p><p>${escapeHtml(
      statusText[reason],
    )}</p><dl><dt>Consultation</dt><dd>${escapeHtml(consultation.start)} (${escapeHtml(
      consultation.timezone,
    )})</dd><dt>Performance</dt><dd>${escapeHtml(show.data.start)} to ${escapeHtml(
      show.data.end,
    )} (${escapeHtml(show.data.timezone)})</dd><dt>Booking reference</dt><dd>${escapeHtml(
      show.id,
    )}</dd></dl><p><small>This is an isolated demonstration workflow.</small></p>`;
    const effect = MailEffectSchema.parse({
      version: 1,
      messageId: `<booking-${show.id}-${reason}@justinleblancmusic.50by50.dev>`,
      envelopeFrom: sender,
      to: [customer.email],
      cc: [],
      bcc: [],
      replyTo,
      subject: subjects[reason],
      text,
      html,
      headers: { 'X-JLM-Show-ID': show.id, 'X-JLM-Booking-Reason': reason },
      attachments: [],
    });
    this.store.enqueue(
      `email:booking:${show.id}:${reason}:${show.revision}`,
      'email.booking_confirmation',
      show.id,
      effect,
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
