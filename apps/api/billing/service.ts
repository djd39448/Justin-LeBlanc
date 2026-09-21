/**
 * Orchestrates calendar reconciliation, authenticated replies, and immutable invoice issue.
 *
 * Dependencies:
 *   - store: SQLite transactions, leases, outbox, audit, and monotonic invoice sequences.
 *   - domain/billing: Reply grammar, quote arithmetic, and immutable snapshot schemas.
 *   - documents: Shared HTML/plain/PDF rendering.
 *   - email adapter: Trusted inbound evidence and validated outbound payloads.
 *
 * Depended on by:
 *   - scheduled morning and IMAP jobs.
 *   - operator API/CLI for run-now, preview, approval, and delivery reconciliation.
 *
 * Why this exists:
 *   Calendar presence and email prose are inputs, not authority. This service joins them to the
 *   approved database records and records every billable transition atomically.
 */
import { createHash, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { z } from 'zod';

import {
  CustomerSchema,
  QuoteSchema,
  ShowSchema,
  TENANT,
  type Quote,
} from '../../../packages/contracts/index.js';
import { renderHtmlPdf, renderInvoice } from '../../../packages/documents/index.js';
import {
  buildInvoiceSnapshot,
  createAmendedQuote,
  hashSecret,
  InvoiceSchema,
  invoiceSnapshotHash,
  parsePerformanceReply,
  PerformanceCheckSchema,
  secretMatches,
  validateAgreedQuote,
  type Invoice,
  type PerformanceCheck,
} from '../../../packages/domain/billing.js';
import type { CalendarShowEvent } from '../adapters/calendar.js';
import {
  isAuthenticatedOperatorMail,
  MailEffectSchema,
  type MailEffect,
  type ReceivedMail,
  visibleReplyText,
} from '../adapters/email.js';
import { Store } from '../store.js';

export type { CalendarShowEvent } from '../adapters/calendar.js';

export interface PerformanceCalendarReader {
  listShowEvents(input: { timeMin: string; timeMax: string }): Promise<CalendarShowEvent[]>;
}

export interface BillingOptions {
  operatorEmail: string;
  performerEmail: string;
  senderEmail: string;
  publicSiteUrl: string;
  privateStoragePath: string;
  sellerDisplayName: string;
  sellerAddress: string;
  demoMode: boolean;
  hostname: string;
  renderPdf?: (html: string, outputPath: string) => Promise<unknown>;
}

export interface MorningCheckResult {
  localDates: string[];
  checked: number;
  queued: number;
  review: number;
  skipped: number;
}

export interface PerformanceFollowupResult {
  examined: number;
  reminded: number;
  escalated: number;
  skipped: number;
}

export type ReplyResult =
  | { outcome: 'ignored' | 'duplicate' | 'needs_review' | 'no_invoice'; reason: string }
  | { outcome: 'awaiting_change_approval'; showId: string; candidateVersion: number }
  | { outcome: 'invoice_approved'; invoiceId: string; number: string };

const JobRunSchema = z.object({
  kind: z.literal('morning_invoice_scan_v2'),
  localDate: z.iso.date(),
  completedAt: z.iso.datetime({ offset: true }),
  eligible: z.number().int().nonnegative(),
});
const ProcessedMailSchema = z.object({
  kind: z.literal('performance_reply'),
  providerMessageId: z.string(),
  uidValidity: z.string(),
  uid: z.number().int().positive(),
  outcome: z.string(),
  processedAt: z.iso.datetime({ offset: true }),
});
const AcceptedOutboxRowSchema = z.object({
  status: z.literal('accepted'),
  kind: z.enum(['email.performance_check', 'email.performance_reminder']),
  entity_id: z.string(),
  payload: z.string(),
  updated_at: z.iso.datetime({ offset: true }),
});

/** Coordinates the full post-performance workflow over one durable Store. */
export class BillingService {
  constructor(
    private readonly store: Store,
    private readonly calendar: PerformanceCalendarReader,
    private readonly options: BillingOptions,
  ) {}

  /**
   * Reconciles up to seven unprocessed Houston dates using actual expanded calendar events.
   * Explicit as-of simulation is allowed only in demo mode.
   */
  async runMorningCheck(
    input: { now?: Date; asOfLocalDate?: string; force?: boolean } = {},
  ): Promise<MorningCheckResult> {
    const now = input.now ?? new Date();
    if (input.asOfLocalDate !== undefined && !this.options.demoMode) {
      throw new Error(
        'Morning as-of simulation is demo-only; remove asOfLocalDate in non-demo mode.',
      );
    }
    const today = input.asOfLocalDate ?? localDate(now, HOUSTON_TIMEZONE);
    if (
      input.asOfLocalDate === undefined &&
      input.force !== true &&
      localHour(now, HOUSTON_TIMEZONE) < 8
    ) {
      throw new Error(
        'Morning scan is not due before 08:00 America/Chicago; use force only from authenticated demo controls.',
      );
    }
    const candidateDates = priorDates(today, 7);
    const dates =
      input.force === true
        ? candidateDates
        : candidateDates.filter(
            (date) => this.store.find('job_runs', morningRunId(date), JobRunSchema) === undefined,
          );
    if (dates.length === 0) return { localDates: [], checked: 0, queued: 0, review: 0, skipped: 0 };

    const scanAnchor = new Date(`${today}T12:00:00.000Z`);
    const events = await this.calendar.listShowEvents({
      timeMin: new Date(scanAnchor.getTime() - 9 * DAY_MS).toISOString(),
      timeMax: new Date(scanAnchor.getTime() + DAY_MS).toISOString(),
    });
    const targetDates = new Set(dates);
    let queued = 0;
    let review = 0;
    let skipped = 0;
    for (const event of events) {
      if (event.status !== 'confirmed' || event.end.kind !== 'dateTime') {
        skipped += 1;
        continue;
      }
      if (!targetDates.has(localDate(new Date(event.end.dateTime), HOUSTON_TIMEZONE))) continue;
      if (event.metadata === null || event.metadata.tenantId !== TENANT) {
        skipped += 1;
        continue;
      }
      const outcome = await this.queueAutomaticInvoice(event, now.toISOString());
      if (outcome === 'queued') queued += 1;
      if (outcome === 'review') review += 1;
      if (outcome === 'skipped') skipped += 1;
    }
    this.store.transaction(() => {
      for (const date of dates) {
        if (this.store.find('job_runs', morningRunId(date), JobRunSchema) === undefined) {
          this.store.insert('job_runs', morningRunId(date), {
            kind: 'morning_invoice_scan_v2',
            localDate: date,
            completedAt: now.toISOString(),
            eligible: queued + review,
          });
        }
      }
    });
    return { localDates: dates, checked: events.length, queued, review, skipped };
  }

  /**
   * Reminds initial unanswered performance checks once after 24 hours and escalates after 72.
   * The clock starts only at definitive original SMTP acceptance or Sent reconciliation.
   * Amendment approval threads remain outside this workflow and visible for operator review.
   */
  runFollowups(input: { now?: Date } = {}): PerformanceFollowupResult {
    const now = input.now ?? new Date();
    const nowMs = now.getTime();
    if (!Number.isFinite(nowMs))
      throw new Error('Follow-up time is invalid; supply a real instant.');

    this.syncAcceptedReminderTimestamps();
    const candidates = this.store
      .all('performance_checks', PerformanceCheckSchema)
      .filter((candidate) => candidate.data.state === 'pending')
      .flatMap((checkEntity) => {
        const row = AcceptedOutboxRowSchema.safeParse(
          this.store.db
            .prepare('SELECT status,kind,entity_id,payload,updated_at FROM outbox WHERE id=?')
            .get(`mail:performance-check:${checkEntity.data.showId}`),
        );
        return row.success &&
          row.data.kind === 'email.performance_check' &&
          row.data.entity_id === checkEntity.data.showId
          ? [{ checkEntity, originalRow: row.data }]
          : [];
      })
      .sort(
        (left, right) =>
          new Date(left.originalRow.updated_at).getTime() -
          new Date(right.originalRow.updated_at).getTime(),
      )
      .slice(0, MAX_FOLLOWUPS_PER_RUN);
    const invoicedShows = new Set(
      this.store.all('invoices', InvoiceSchema).map((invoice) => invoice.data.showId),
    );
    const result: PerformanceFollowupResult = {
      examined: candidates.length,
      reminded: 0,
      escalated: 0,
      skipped: 0,
    };

    for (const candidate of candidates) {
      const checkEntity = candidate.checkEntity;
      const check = checkEntity.data;
      const originalRow = candidate.originalRow;
      const show = this.store.find('shows', check.showId, ShowSchema);
      if (
        invoicedShows.has(check.showId) ||
        show === undefined ||
        show.data.status !== 'awaiting_performance_reply'
      ) {
        result.skipped += 1;
        continue;
      }
      const deliveredAtMs = new Date(originalRow.updated_at).getTime();
      const ageMs = nowMs - deliveredAtMs;
      if (ageMs < 0 || ageMs < FOLLOWUP_REMINDER_AFTER_MS) {
        result.skipped += 1;
        continue;
      }
      if (ageMs >= FOLLOWUP_REVIEW_AFTER_MS) {
        this.escalateUnansweredCheck(
          checkEntity.id,
          checkEntity.revision,
          check,
          show.revision,
          now,
        );
        result.escalated += 1;
        continue;
      }
      if (check.reminderQueuedAt !== null || check.reminderMessageId !== null) {
        result.skipped += 1;
        continue;
      }

      const originalMail = MailEffectSchema.safeParse(parseJsonSafely(originalRow.payload));
      if (!originalMail.success || originalMail.data.messageId !== check.outboundMessageId) {
        this.escalateInvalidFollowup(
          checkEntity.id,
          checkEntity.revision,
          check,
          show.revision,
          now,
          'Original outbox Message-ID did not match the performance check.',
        );
        result.escalated += 1;
        continue;
      }
      const nonce = extractCorrelationNonce(originalMail.data.text, checkEntity.id);
      if (nonce === undefined || !secretMatches(nonce, check.replyNonceHash)) {
        this.escalateInvalidFollowup(
          checkEntity.id,
          checkEntity.revision,
          check,
          show.revision,
          now,
          'Original performance-check nonce could not be verified.',
        );
        result.escalated += 1;
        continue;
      }

      const reminder = this.performanceReminderMailEffect(checkEntity.id, nonce, originalMail.data);
      this.store.transaction(() => {
        const fresh = this.store.get('performance_checks', checkEntity.id, PerformanceCheckSchema);
        if (
          fresh.data.state !== 'pending' ||
          fresh.data.reminderQueuedAt !== null ||
          fresh.data.reminderMessageId !== null
        ) {
          throw new Error(
            `Performance check ${checkEntity.id} changed during follow-up; refresh before retrying.`,
          );
        }
        this.store.update(
          'performance_checks',
          fresh.id,
          fresh.revision,
          PerformanceCheckSchema.parse({
            ...fresh.data,
            reminderMessageId: reminder.messageId,
            reminderQueuedAt: now.toISOString(),
          }),
        );
        this.store.enqueue(
          `mail:performance-reminder:${check.showId}`,
          'email.performance_reminder',
          check.showId,
          reminder,
        );
        this.store.audit('billing-followups', 'performance_check.reminder_queued', check.showId, {
          originalDeliveredAt: originalRow.updated_at,
          reminderMessageId: reminder.messageId,
        });
      });
      result.reminded += 1;
    }
    return result;
  }

  private syncAcceptedReminderTimestamps(): void {
    const accepted = this.store
      .all('performance_checks', PerformanceCheckSchema)
      .filter(
        (check) => check.data.reminderMessageId !== null && check.data.reminderSentAt === null,
      )
      .flatMap((checkEntity) => {
        const row = AcceptedOutboxRowSchema.safeParse(
          this.store.db
            .prepare('SELECT status,kind,entity_id,payload,updated_at FROM outbox WHERE id=?')
            .get(`mail:performance-reminder:${checkEntity.data.showId}`),
        );
        const mail = row.success
          ? MailEffectSchema.safeParse(parseJsonSafely(row.data.payload))
          : undefined;
        return row.success &&
          row.data.kind === 'email.performance_reminder' &&
          row.data.entity_id === checkEntity.data.showId &&
          mail?.success === true &&
          mail.data.messageId === checkEntity.data.reminderMessageId
          ? [{ checkEntity, acceptedAt: row.data.updated_at }]
          : [];
      })
      .sort(
        (left, right) => new Date(left.acceptedAt).getTime() - new Date(right.acceptedAt).getTime(),
      )
      .slice(0, MAX_FOLLOWUPS_PER_RUN);

    for (const { checkEntity, acceptedAt } of accepted) {
      this.store.transaction(() => {
        const fresh = this.store.get('performance_checks', checkEntity.id, PerformanceCheckSchema);
        if (
          fresh.data.reminderMessageId === checkEntity.data.reminderMessageId &&
          fresh.data.reminderSentAt === null
        ) {
          this.store.update(
            'performance_checks',
            fresh.id,
            fresh.revision,
            PerformanceCheckSchema.parse({ ...fresh.data, reminderSentAt: acceptedAt }),
          );
        }
      });
    }
  }

  /** Processes one parsed Inbox message; authentication/correlation failures cannot mutate money. */
  async processReply(message: ReceivedMail): Promise<ReplyResult> {
    const processedId = processedMailId(message.messageId);
    if (this.store.find('processed_events', processedId, ProcessedMailSchema) !== undefined) {
      return { outcome: 'duplicate', reason: 'Provider Message-ID was already processed.' };
    }
    if (!isAuthenticatedOperatorMail(message, this.options.operatorEmail)) {
      return this.recordIgnored(message, 'Sender or authentication evidence was not authorized.');
    }
    const checkEntity = this.store
      .all('performance_checks', PerformanceCheckSchema)
      .find(
        (candidate) =>
          candidate.data.outboundMessageId === message.inReplyTo ||
          candidate.data.reminderMessageId === message.inReplyTo ||
          candidate.data.approvalMessageId === message.inReplyTo,
      );
    if (checkEntity === undefined) {
      return this.recordIgnored(message, 'In-Reply-To did not match a performance-check message.');
    }
    const command = parsePerformanceReply(visibleReplyText(message.text));
    const isApprovalThread = checkEntity.data.approvalMessageId === message.inReplyTo;
    const replyNonce = extractCorrelationNonce(message.text, checkEntity.id);
    if (
      (!isApprovalThread &&
        (replyNonce === undefined ||
          !secretMatches(replyNonce, checkEntity.data.replyNonceHash))) ||
      (isApprovalThread && command.kind !== 'approve')
    ) {
      return this.recordIgnored(message, 'Reply correlation token was missing or invalid.');
    }
    if (command.kind === 'not_performed') {
      this.markNotPerformed(checkEntity.id, checkEntity.revision, checkEntity.data, message);
      return {
        outcome: 'no_invoice',
        reason: 'Authorized performer reported the show was not performed.',
      };
    }
    if (command.kind === 'ambiguous') {
      this.markNeedsReview(
        checkEntity.id,
        checkEntity.revision,
        checkEntity.data,
        message,
        command.reason,
      );
      return { outcome: 'needs_review', reason: command.reason };
    }
    if (command.kind === 'changed') {
      return this.proposeAmendment(
        checkEntity.id,
        checkEntity.revision,
        checkEntity.data,
        message,
        command.lines,
      );
    }
    if (command.kind === 'approve') {
      return this.approveAmendment(
        checkEntity.id,
        checkEntity.revision,
        checkEntity.data,
        message,
        command.version,
        command.token,
      );
    }
    return this.issueFromReply(checkEntity.id, checkEntity.revision, checkEntity.data, message);
  }

  /** Renders a recoverable approved invoice and enqueues its To+BCC mail effect exactly once. */
  async prepareInvoiceDelivery(invoiceId: string): Promise<Invoice> {
    const invoiceEntity = this.store.get('invoices', invoiceId, InvoiceSchema);
    if (invoiceEntity.data.status === 'sent' || invoiceEntity.data.status === 'issuing')
      return invoiceEntity.data;
    const rendered = renderInvoice(invoiceEntity.data);
    const pdfPath = join(this.options.privateStoragePath, `${invoiceId}.pdf`);
    await (this.options.renderPdf ?? renderHtmlPdf)(rendered.html, pdfPath);
    const contentHash = createHash('sha256')
      .update(await readFile(pdfPath))
      .digest('hex');
    const effect = this.invoiceMailEffect(invoiceEntity.data, rendered, pdfPath);
    return this.store.transaction(() => {
      const fresh = this.store.get('invoices', invoiceId, InvoiceSchema);
      if (fresh.data.status === 'sent' || fresh.data.status === 'issuing') return fresh.data;
      const updated = InvoiceSchema.parse({
        ...fresh.data,
        status: 'issuing',
        pdfKey: pdfPath,
        contentHash,
      });
      this.store.update('invoices', invoiceId, fresh.revision, updated);
      this.store.enqueue(`mail:invoice:${invoiceId}`, 'email.invoice', invoiceId, effect);
      this.store.audit('billing-service', 'invoice.delivery_queued', invoiceId, {
        showId: updated.showId,
      });
      return updated;
    });
  }

  /** Applies a definitive outbox delivery result without ever auto-resending uncertain mail. */
  markInvoiceDelivery(input: {
    invoiceId: string;
    status: 'sent' | 'uncertain' | 'failed';
    providerMessageId: string | null;
    at?: string;
  }): Invoice {
    return this.store.transaction(() => {
      const entity = this.store.get('invoices', input.invoiceId, InvoiceSchema);
      const status =
        input.status === 'sent'
          ? 'sent'
          : input.status === 'uncertain'
            ? 'delivery_pending'
            : 'needs_review';
      const updated = InvoiceSchema.parse({
        ...entity.data,
        status,
        providerMessageId: input.providerMessageId,
        sentAt: input.status === 'sent' ? (input.at ?? new Date().toISOString()) : null,
      });
      this.store.update('invoices', input.invoiceId, entity.revision, updated);
      this.store.audit('mail-dispatcher', `invoice.delivery_${input.status}`, input.invoiceId, {
        providerMessageId: input.providerMessageId,
      });
      return updated;
    });
  }

  /**
   * Treats one completed, app-owned Calendar performance as performed and prepares its invoice.
   * Existing invoice state always wins so render recovery can resume without resending mail.
   */
  private async queueAutomaticInvoice(
    event: CalendarShowEvent,
    issuedAt: string,
  ): Promise<'queued' | 'review' | 'skipped'> {
    const metadata = event.metadata;
    if (metadata === null || event.start.kind !== 'dateTime' || event.end.kind !== 'dateTime') {
      return 'skipped';
    }
    const existingInvoice = this.store
      .all('invoices', InvoiceSchema)
      .find((invoice) => invoice.data.showId === metadata.showId);
    if (existingInvoice !== undefined) {
      if (existingInvoice.data.status !== 'approved') return 'skipped';
      await this.prepareInvoiceDelivery(existingInvoice.id);
      this.store.audit('morning-job', 'invoice.delivery_resumed', existingInvoice.id, {
        showId: metadata.showId,
        calendarEventId: event.eventId,
      });
      return 'queued';
    }
    const showEntity = this.store.find('shows', metadata.showId, ShowSchema);
    if (showEntity?.data.status === 'awaiting_performance_reply') {
      this.markLegacyCheckForReview(showEntity.id, showEntity.revision, event.eventId);
      return 'review';
    }
    if (showEntity === undefined || showEntity.data.status !== 'confirmed') {
      return 'skipped';
    }
    if (showEntity.data.quoteId === null) {
      this.markShowForReview(
        showEntity.id,
        showEntity.revision,
        event.eventId,
        'approved_quote_missing',
      );
      return 'review';
    }
    const quoteEntity = this.store.find('quotes', showEntity.data.quoteId, QuoteSchema);
    const customerEntity = this.store.find('customers', showEntity.data.customerId, CustomerSchema);
    if (
      showEntity.data.customerId !== metadata.customerId ||
      new Date(event.start.dateTime).getTime() !== new Date(showEntity.data.start).getTime() ||
      new Date(event.end.dateTime).getTime() !== new Date(showEntity.data.end).getTime() ||
      customerEntity === undefined ||
      quoteEntity === undefined ||
      quoteEntity.data.showId !== showEntity.id ||
      quoteEntity.data.version !== metadata.quoteVersion ||
      quoteEntity.data.totalCents !== metadata.agreedTotalCents ||
      quoteEntity.data.currency !== metadata.currency
    ) {
      this.markShowForReview(
        showEntity.id,
        showEntity.revision,
        event.eventId,
        'calendar_record_mismatch',
      );
      return 'review';
    }
    let snapshot: Invoice['snapshot'];
    const issueLocalDate = localDate(new Date(issuedAt), HOUSTON_TIMEZONE);
    try {
      validateAgreedQuote(quoteEntity.data);
      snapshot = buildInvoiceSnapshot({
        showId: showEntity.id,
        show: showEntity.data,
        customer: customerEntity.data,
        quote: quoteEntity.data,
        seller: {
          displayName: this.options.sellerDisplayName,
          address: this.options.sellerAddress,
          replyEmail: this.options.senderEmail,
          demoDisclosure: 'Demo invoice using provisional terms. Not a payment request.',
        },
        issuedAt,
        dueDate: addLocalDateDays(issueLocalDate, 14),
      });
    } catch {
      this.markShowForReview(
        showEntity.id,
        showEntity.revision,
        event.eventId,
        'invoice_validation_failed',
      );
      return 'review';
    }
    const invoiceId = `invoice-${showEntity.id}`;
    this.store.transaction(() => {
      const issueYear = issueLocalDate.slice(0, 4);
      const sequence = this.store.nextSequence(`invoice:${issueYear}`);
      const number = `JLM-DEMO-${issueYear}-${String(sequence).padStart(4, '0')}`;
      const invoice = InvoiceSchema.parse({
        showId: showEntity.id,
        number,
        kind: 'performance',
        status: 'approved',
        snapshot,
        snapshotHash: invoiceSnapshotHash(snapshot),
        pdfKey: '',
        contentHash: null,
        outboundMessageId: `<invoice.${invoiceId}@${this.options.hostname}>`,
        providerMessageId: null,
        sentAt: null,
      });
      this.store.insert('invoices', invoiceId, invoice);
      this.store.update(
        'shows',
        showEntity.id,
        showEntity.revision,
        ShowSchema.parse({ ...showEntity.data, status: 'performed' }),
      );
      this.store.audit('morning-job', 'invoice.auto_approved', invoiceId, {
        showId: showEntity.id,
        calendarEventId: event.eventId,
        calendarEtag: event.etag,
        quoteId: quoteEntity.id,
        quoteVersion: quoteEntity.data.version,
        totalCents: quoteEntity.data.totalCents,
      });
    });
    await this.prepareInvoiceDelivery(invoiceId);
    return 'queued';
  }

  private markLegacyCheckForReview(showId: string, showRevision: number, eventId: string): void {
    const checkId = performanceCheckId(showId);
    this.store.transaction(() => {
      const show = this.store.get('shows', showId, ShowSchema);
      if (show.revision !== showRevision || show.data.status !== 'awaiting_performance_reply') {
        throw new Error(`Show ${showId} changed during morning reconciliation; refresh and retry.`);
      }
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, status: 'needs_review' }),
      );
      const check = this.store.find('performance_checks', checkId, PerformanceCheckSchema);
      if (check !== undefined && check.data.state !== 'completed' && check.data.state !== 'no_invoice') {
        this.store.update(
          'performance_checks',
          check.id,
          check.revision,
          PerformanceCheckSchema.parse({
            ...check.data,
            state: 'needs_review',
            decision: 'ambiguous',
          }),
        );
      }
      this.store.audit('morning-job', 'show.legacy_performance_check_review', showId, {
        calendarEventId: eventId,
      });
    });
  }

  private markShowForReview(
    showId: string,
    revision: number,
    eventId: string,
    reason: string,
  ): void {
    this.store.transaction(() => {
      const show = this.store.get('shows', showId, ShowSchema);
      if (show.revision !== revision || show.data.status !== 'confirmed') {
        throw new Error(`Show ${showId} changed during morning validation; refresh and retry.`);
      }
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, status: 'needs_review' }),
      );
      this.store.audit('morning-job', 'show.invoice_review', showId, {
        calendarEventId: eventId,
        reason,
      });
    });
  }

  private markNotPerformed(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
  ): void {
    this.store.transaction(() => {
      const show = this.store.get('shows', check.showId, ShowSchema);
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({
          ...check,
          state: 'no_invoice',
          decision: 'not_performed',
          repliedAt: message.receivedAt,
        }),
      );
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, status: 'not_performed' }),
      );
      this.recordProcessed(message, 'not_performed');
      this.store.audit(message.from, 'show.not_performed', show.id, {
        providerMessageId: message.messageId,
      });
    });
  }

  private markNeedsReview(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
    reason: string,
  ): void {
    this.store.transaction(() => {
      const show = this.store.get('shows', check.showId, ShowSchema);
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({
          ...check,
          state: 'needs_review',
          decision: 'ambiguous',
          repliedAt: message.receivedAt,
        }),
      );
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, status: 'needs_review' }),
      );
      this.recordProcessed(message, 'needs_review');
      this.store.audit('billing-service', 'performance_reply.needs_review', check.showId, {
        reason,
      });
    });
  }

  private proposeAmendment(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
    lines: PerformanceCheck['candidateLines'],
  ): ReplyResult {
    const quote = this.store.get('quotes', check.quoteId, QuoteSchema);
    const approvalToken = randomBytes(18).toString('base64url');
    const candidate = createAmendedQuote(quote.data, lines, message.from, message.receivedAt);
    const effect = this.amendmentApprovalMailEffect(
      checkId,
      candidate,
      approvalToken,
      check.outboundMessageId,
    );
    this.store.transaction(() => {
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({
          ...check,
          state: 'awaiting_change_approval',
          decision: 'changed',
          candidateLines: lines,
          candidateQuoteVersion: candidate.version,
          approvalTokenHash: hashSecret(approvalToken),
          approvalMessageId: effect.messageId,
          repliedAt: message.receivedAt,
        }),
      );
      this.recordProcessed(message, 'awaiting_change_approval');
      this.store.enqueue(
        `mail:amendment-approval:${check.showId}:v${candidate.version}`,
        'email.amendment_approval',
        check.showId,
        effect,
      );
      this.store.audit(message.from, 'invoice.amendment_proposed', check.showId, {
        candidateVersion: candidate.version,
        candidateTotalCents: candidate.totalCents,
      });
    });
    return {
      outcome: 'awaiting_change_approval',
      showId: check.showId,
      candidateVersion: candidate.version,
    };
  }

  private async approveAmendment(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
    version: number,
    token: string,
  ): Promise<ReplyResult> {
    if (
      check.state !== 'awaiting_change_approval' ||
      check.candidateQuoteVersion !== version ||
      check.approvalTokenHash === null ||
      !secretMatches(token, check.approvalTokenHash)
    ) {
      this.markNeedsReview(
        checkId,
        revision,
        check,
        message,
        'Approval version or token was invalid or stale.',
      );
      return { outcome: 'needs_review', reason: 'Approval version or token was invalid or stale.' };
    }
    const original = this.store.get('quotes', check.quoteId, QuoteSchema);
    const amended = createAmendedQuote(
      original.data,
      check.candidateLines,
      message.from,
      message.receivedAt,
    );
    const quoteId = `${check.showId}-agreed-v${amended.version}`;
    this.store.transaction(() => {
      this.store.insert('quotes', quoteId, amended);
      const show = this.store.get('shows', check.showId, ShowSchema);
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, quoteId }),
      );
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({
          ...check,
          quoteId,
          quoteVersion: amended.version,
          agreedTotalCents: amended.totalCents,
        }),
      );
      this.recordProcessed(message, 'amendment_approved');
      this.store.enqueue(
        `calendar:amendment:${check.showId}:v${amended.version}`,
        'calendar.upsert',
        check.showId,
        {
          version: 1,
          showId: check.showId,
          role: 'performance',
          reason: 'approved_invoice_amendment',
        },
      );
      this.store.audit(message.from, 'invoice.amendment_approved', check.showId, {
        quoteId,
        quoteVersion: amended.version,
        totalCents: amended.totalCents,
      });
    });
    const updatedCheck = this.store.get('performance_checks', checkId, PerformanceCheckSchema);
    return this.issueInvoice(
      checkId,
      updatedCheck.revision,
      updatedCheck.data,
      message,
      amended,
      true,
    );
  }

  private async issueFromReply(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
  ): Promise<ReplyResult> {
    if (check.state !== 'pending') {
      return this.recordIgnored(message, `Performance check is already ${check.state}.`);
    }
    const quote = this.store.get('quotes', check.quoteId, QuoteSchema);
    return this.issueInvoice(checkId, revision, check, message, quote.data, false);
  }

  private async issueInvoice(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    message: ReceivedMail,
    quote: Quote,
    mailAlreadyProcessed: boolean,
  ): Promise<ReplyResult> {
    validateAgreedQuote(quote);
    const invoiceId = `invoice-${check.showId}`;
    const existing = this.store.find('invoices', invoiceId, InvoiceSchema);
    if (existing !== undefined)
      return { outcome: 'duplicate', reason: 'Invoice already exists for this show.' };
    const show = this.store.get('shows', check.showId, ShowSchema);
    const customer = this.store.get('customers', check.customerId, CustomerSchema);
    const issuedAt = message.receivedAt;
    const numberAndInvoice = this.store.transaction(() => {
      const sequence = this.store.nextSequence(`invoice:${issuedAt.slice(0, 4)}`);
      const number = `JLM-DEMO-${issuedAt.slice(0, 4)}-${String(sequence).padStart(4, '0')}`;
      const snapshot = buildInvoiceSnapshot({
        showId: show.id,
        show: show.data,
        customer: customer.data,
        quote,
        seller: {
          displayName: this.options.sellerDisplayName,
          address: this.options.sellerAddress,
          replyEmail: this.options.senderEmail,
          demoDisclosure: 'Demo invoice using provisional terms. Not a payment request.',
        },
        issuedAt,
        dueDate: addUtcDays(issuedAt, 14),
      });
      const invoice = InvoiceSchema.parse({
        showId: show.id,
        number,
        kind: 'performance',
        status: 'approved',
        snapshot,
        snapshotHash: invoiceSnapshotHash(snapshot),
        pdfKey: '',
        contentHash: null,
        outboundMessageId: `<invoice.${invoiceId}@${this.options.hostname}>`,
        providerMessageId: null,
        sentAt: null,
      });
      this.store.insert('invoices', invoiceId, invoice);
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({
          ...check,
          state: 'completed',
          decision: 'performed',
          repliedAt: message.receivedAt,
        }),
      );
      const freshShow = this.store.get('shows', show.id, ShowSchema);
      this.store.update(
        'shows',
        show.id,
        freshShow.revision,
        ShowSchema.parse({ ...freshShow.data, status: 'performed' }),
      );
      if (!mailAlreadyProcessed) this.recordProcessed(message, 'invoice_approved');
      this.store.audit(message.from, 'invoice.approved', invoiceId, {
        showId: show.id,
        quoteVersion: quote.version,
        totalCents: quote.totalCents,
      });
      return { number, invoice };
    });
    await this.prepareInvoiceDelivery(invoiceId);
    return { outcome: 'invoice_approved', invoiceId, number: numberAndInvoice.number };
  }

  private recordIgnored(message: ReceivedMail, reason: string): ReplyResult {
    this.store.transaction(() => {
      this.recordProcessed(message, 'ignored');
      this.store.audit('mail-worker', 'performance_reply.ignored', message.messageId, { reason });
    });
    return { outcome: 'ignored', reason };
  }

  private recordProcessed(message: ReceivedMail, outcome: string): void {
    this.store.insert('processed_events', processedMailId(message.messageId), {
      kind: 'performance_reply',
      providerMessageId: message.messageId,
      uidValidity: message.uidValidity,
      uid: message.uid,
      outcome,
      processedAt: new Date().toISOString(),
    });
  }

  private performanceReminderMailEffect(
    checkId: string,
    nonce: string,
    original: MailEffect,
  ): MailEffect {
    const token = `[JLM-REPLY:${checkId}:${nonce}]`;
    const messageId = `<performance-reminder.${checkId}@${this.options.hostname}>`;
    const instructions =
      'Reply with exactly YES (no changes), NO (not performed), or the documented YES plus ADD lines.';
    return MailEffectSchema.parse({
      version: 1,
      messageId,
      envelopeFrom: this.options.senderEmail,
      to: [this.options.operatorEmail],
      cc: [],
      bcc: [],
      replyTo: this.options.senderEmail,
      subject: `Reminder: ${original.subject}`,
      text: `Reminder: the performance check below is still awaiting your reply.\n\n${instructions}\n\nDo not delete this correlation line:\n${token}`,
      html: `<div style="font-family:Arial,sans-serif;color:#13233a;line-height:1.45"><h1 style="color:#092f54">Performance check reminder</h1><p>The original performance check is still awaiting your reply.</p><p>${escapeHtml(instructions)}</p><p style="color:#526579">Do not delete: ${escapeHtml(token)}</p></div>`,
      headers: {
        'In-Reply-To': original.messageId,
        References: original.messageId,
        'X-JLM-Check-ID': checkId,
        'X-JLM-Tenant': TENANT,
      },
      attachments: [],
    });
  }

  private escalateUnansweredCheck(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    showRevision: number,
    now: Date,
  ): void {
    this.store.transaction(() => {
      this.store.update(
        'performance_checks',
        checkId,
        revision,
        PerformanceCheckSchema.parse({ ...check, state: 'needs_review' }),
      );
      const show = this.store.get('shows', check.showId, ShowSchema);
      if (show.revision !== showRevision || show.data.status !== 'awaiting_performance_reply') {
        throw new Error(`Show ${check.showId} changed during follow-up; refresh before retrying.`);
      }
      this.store.update(
        'shows',
        show.id,
        show.revision,
        ShowSchema.parse({ ...show.data, status: 'needs_review' }),
      );
      this.store.audit('billing-followups', 'performance_check.no_reply_review', check.showId, {
        escalatedAt: now.toISOString(),
      });
    });
  }

  private escalateInvalidFollowup(
    checkId: string,
    revision: number,
    check: PerformanceCheck,
    showRevision: number,
    now: Date,
    reason: string,
  ): void {
    this.escalateUnansweredCheck(checkId, revision, check, showRevision, now);
    this.store.audit('billing-followups', 'performance_check.reminder_blocked', check.showId, {
      reason,
    });
  }

  private amendmentApprovalMailEffect(
    checkId: string,
    quote: Quote,
    approvalToken: string,
    inReplyTo: string,
  ): MailEffect {
    const command = `APPROVE ${quote.version} ${approvalToken}`;
    const messageId = `<amendment.${checkId}.v${quote.version}@${this.options.hostname}>`;
    const text = `Candidate revised total: ${formatUsd(quote.totalCents)}\n\n${quote.lines.map((line) => `${line.quantity} x ${line.description} @ ${formatUsd(line.unitCents)}`).join('\n')}\n\nTo approve this exact version, reply with:\n${command}`;
    return MailEffectSchema.parse({
      version: 1,
      messageId,
      envelopeFrom: this.options.senderEmail,
      to: [this.options.operatorEmail],
      cc: [],
      bcc: [],
      replyTo: this.options.senderEmail,
      subject: `[Justin Demo][${checkId}] Approve revised total ${formatUsd(quote.totalCents)}`,
      text,
      html: `<div style="font-family:Arial,sans-serif;color:#13233a"><h1>Approve revised total</h1><p><strong>${formatUsd(quote.totalCents)}</strong></p><p>Reply with this exact command:</p><p><code>${escapeHtml(command)}</code></p></div>`,
      headers: { 'In-Reply-To': inReplyTo, References: inReplyTo, 'X-JLM-Check-ID': checkId },
      attachments: [],
    });
  }

  private invoiceMailEffect(
    invoice: Invoice,
    rendered: { html: string; text: string },
    pdfPath: string,
  ): MailEffect {
    return MailEffectSchema.parse({
      version: 1,
      messageId: invoice.outboundMessageId,
      envelopeFrom: this.options.senderEmail,
      to: [invoice.snapshot.customer.billingEmail],
      cc: [],
      bcc: [this.options.performerEmail],
      replyTo: this.options.senderEmail,
      subject: `[DEMO] Invoice ${invoice.number} - not a payment request`,
      text: rendered.text,
      html: rendered.html,
      headers: { 'X-JLM-Invoice-ID': invoice.number, 'X-JLM-Tenant': TENANT },
      attachments: [
        { filename: `${invoice.number}.pdf`, path: pdfPath, contentType: 'application/pdf' },
      ],
    });
  }
}

const HOUSTON_TIMEZONE = 'America/Chicago';
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const FOLLOWUP_REMINDER_AFTER_MS = 24 * HOUR_MS;
const FOLLOWUP_REVIEW_AFTER_MS = 72 * HOUR_MS;
const MAX_FOLLOWUPS_PER_RUN = 100;

/** Returns the local YYYY-MM-DD for a real instant in an IANA timezone. */
export function localDate(instant: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (values.year === undefined || values.month === undefined || values.day === undefined) {
    throw new Error(
      `Could not derive local date for timezone ${timezone}; verify ICU timezone data.`,
    );
  }
  return `${values.year}-${values.month}-${values.day}`;
}

function localHour(instant: Date, timezone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(instant)
    .find((part) => part.type === 'hour')?.value;
  if (hour === undefined) throw new Error(`Could not derive local hour for timezone ${timezone}.`);
  return Number.parseInt(hour, 10);
}

function priorDates(today: string, maximum: number): string[] {
  const parsed = z.iso.date().parse(today);
  const noonUtc = new Date(`${parsed}T12:00:00Z`);
  const dates: string[] = [];
  for (let days = 1; days <= maximum; days += 1) {
    dates.push(new Date(noonUtc.getTime() - days * DAY_MS).toISOString().slice(0, 10));
  }
  return dates;
}

function addUtcDays(instant: string, days: number): string {
  return new Date(new Date(instant).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

function addLocalDateDays(date: string, days: number): string {
  const parsed = z.iso.date().parse(date);
  return new Date(new Date(`${parsed}T12:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function morningRunId(date: string): string {
  return `morning:auto-invoice:v2:${date}`;
}

function performanceCheckId(showId: string): string {
  return `show-${showId}`;
}

function processedMailId(messageId: string): string {
  return `mail-${createHash('sha256').update(messageId.toLowerCase()).digest('hex')}`;
}

function extractCorrelationNonce(text: string, checkId: string): string | undefined {
  const escaped = checkId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`\\[JLM-REPLY:${escaped}:([A-Za-z0-9_-]{16,128})\\]`));
  return match?.[1];
}

function parseJsonSafely(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)} USD`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    const replacement = replacements[character];
    if (replacement === undefined) throw new Error('HTML escaping table is incomplete.');
    return replacement;
  });
}
