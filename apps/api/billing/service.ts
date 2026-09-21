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
  type Show,
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

export type ReplyResult =
  | { outcome: 'ignored' | 'duplicate' | 'needs_review' | 'no_invoice'; reason: string }
  | { outcome: 'awaiting_change_approval'; showId: string; candidateVersion: number }
  | { outcome: 'invoice_approved'; invoiceId: string; number: string };

const JobRunSchema = z.object({
  kind: z.literal('morning_scan'),
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
    const dates = priorDates(today, 7).filter(
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
      const outcome = this.queuePerformanceCheck(event);
      if (outcome === 'queued') queued += 1;
      if (outcome === 'review') review += 1;
      if (outcome === 'skipped') skipped += 1;
    }
    this.store.transaction(() => {
      for (const date of dates) {
        if (this.store.find('job_runs', morningRunId(date), JobRunSchema) === undefined) {
          this.store.insert('job_runs', morningRunId(date), {
            kind: 'morning_scan',
            localDate: date,
            completedAt: now.toISOString(),
            eligible: queued + review,
          });
        }
      }
    });
    return { localDates: dates, checked: events.length, queued, review, skipped };
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

  private queuePerformanceCheck(event: CalendarShowEvent): 'queued' | 'review' | 'skipped' {
    const metadata = event.metadata;
    if (metadata === null) return 'skipped';
    const existingInvoice = this.store
      .all('invoices', InvoiceSchema)
      .find((invoice) => invoice.data.showId === metadata.showId);
    if (existingInvoice !== undefined) return 'skipped';
    const checkId = performanceCheckId(metadata.showId);
    if (this.store.find('performance_checks', checkId, PerformanceCheckSchema) !== undefined)
      return 'skipped';
    const showEntity = this.store.find('shows', metadata.showId, ShowSchema);
    if (
      showEntity === undefined ||
      showEntity.data.status !== 'confirmed' ||
      showEntity.data.quoteId === null
    ) {
      return 'skipped';
    }
    const quoteEntity = this.store.find('quotes', showEntity.data.quoteId, QuoteSchema);
    const mismatch =
      showEntity.data.customerId !== metadata.customerId ||
      quoteEntity === undefined ||
      quoteEntity.data.version !== metadata.quoteVersion ||
      quoteEntity.data.totalCents !== metadata.agreedTotalCents ||
      quoteEntity.data.currency !== metadata.currency;
    if (mismatch) {
      this.store.transaction(() => {
        const reviewShow = ShowSchema.parse({ ...showEntity.data, status: 'needs_review' });
        this.store.update('shows', showEntity.id, showEntity.revision, reviewShow);
        this.store.audit('morning-job', 'show.calendar_quote_mismatch', showEntity.id, {
          calendarEventId: event.eventId,
        });
      });
      return 'review';
    }
    validateAgreedQuote(quoteEntity.data);
    const nonce = randomBytes(18).toString('base64url');
    const messageId = `<performance-check.${checkId}@${this.options.hostname}>`;
    const check = PerformanceCheckSchema.parse({
      showId: showEntity.id,
      calendarEventId: event.eventId,
      calendarEtag: event.etag,
      customerId: showEntity.data.customerId,
      quoteId: quoteEntity.id,
      quoteVersion: quoteEntity.data.version,
      agreedTotalCents: quoteEntity.data.totalCents,
      currency: quoteEntity.data.currency,
      authorizedResponder: this.options.operatorEmail.toLowerCase(),
      replyNonceHash: hashSecret(nonce),
      outboundMessageId: messageId,
      approvalMessageId: null,
      state: 'pending',
      decision: 'unknown',
      candidateLines: [],
      candidateQuoteVersion: null,
      approvalTokenHash: null,
      reminderSentAt: null,
      repliedAt: null,
    });
    const effect = this.performanceCheckMailEffect(
      checkId,
      nonce,
      showEntity.data,
      quoteEntity.data,
      messageId,
    );
    this.store.transaction(() => {
      this.store.insert('performance_checks', checkId, check);
      this.store.update(
        'shows',
        showEntity.id,
        showEntity.revision,
        ShowSchema.parse({ ...showEntity.data, status: 'awaiting_performance_reply' }),
      );
      this.store.enqueue(
        `mail:performance-check:${showEntity.id}`,
        'email.performance_check',
        showEntity.id,
        effect,
      );
      this.store.audit('morning-job', 'performance_check.queued', showEntity.id, {
        calendarEventId: event.eventId,
        quoteVersion: quoteEntity.data.version,
      });
    });
    return 'queued';
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

  private performanceCheckMailEffect(
    checkId: string,
    nonce: string,
    show: Show,
    quote: Quote,
    messageId: string,
  ): MailEffect {
    const lines = quote.lines
      .map((line) => `${line.quantity} x ${line.description} @ ${formatUsd(line.unitCents)}`)
      .join('\n');
    const token = `[JLM-REPLY:${checkId}:${nonce}]`;
    const subject = `[Justin Demo][${checkId}] Did you play ${show.eventType} on ${localDate(new Date(show.end), show.timezone)}?`;
    const text = `Did you perform this show?\n\nVenue: ${show.venue || 'To confirm'}, ${show.city}\nEnd: ${show.end} (${show.timezone})\n\n${lines}\nAgreed total: ${formatUsd(quote.totalCents)}\n\nReply with exactly YES (no changes), NO (not performed), or:\nYES\nADD | description | quantity | unit amount\n\nDo not delete this correlation line:\n${token}`;
    return MailEffectSchema.parse({
      version: 1,
      messageId,
      envelopeFrom: this.options.senderEmail,
      to: [this.options.operatorEmail],
      cc: [],
      bcc: [],
      replyTo: this.options.senderEmail,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;color:#13233a;line-height:1.45"><h1 style="color:#092f54">Did you perform this show?</h1><p><strong>${escapeHtml(show.eventType)}</strong><br>${escapeHtml(show.venue || 'To confirm')}, ${escapeHtml(show.city)}<br>${escapeHtml(show.end)} (${escapeHtml(show.timezone)})</p><pre style="white-space:pre-wrap">${escapeHtml(lines)}</pre><p><strong>Agreed total: ${formatUsd(quote.totalCents)}</strong></p><p>Reply with <strong>YES</strong> (no changes), <strong>NO</strong> (not performed), or itemized lines in this exact form:<br><code>YES<br>ADD | description | quantity | unit amount</code></p><p style="color:#526579">Do not delete: ${escapeHtml(token)}</p></div>`,
      headers: { 'X-JLM-Check-ID': checkId, 'X-JLM-Tenant': TENANT },
      attachments: [],
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

function morningRunId(date: string): string {
  return `morning:${date}`;
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
