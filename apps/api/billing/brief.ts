/**
 * Builds and queues a private event brief from canonical booking records.
 *
 * Dependencies: Store records, shared document templates/PDF renderer, MailEffect contract.
 * Depended on by: document.event_brief outbox preparation and operator preview endpoints.
 * Why: booking transactions enqueue only a show ID; slow PDF work runs afterward and the email is
 * never queued until its attachment exists.
 */
import { join } from 'node:path';

import { z } from 'zod';

import {
  ConsultationSchema,
  CustomerSchema,
  InquirySchema,
  QuoteSchema,
  ShowSchema,
} from '../../../packages/contracts/index.js';
import {
  renderEventBrief,
  renderHtmlPdf,
  type EventBrief,
} from '../../../packages/documents/index.js';
import { MailEffectSchema, type MailEffect } from '../adapters/email.js';
import { Store } from '../store.js';

export const EventBriefPreparationSchema = z.object({
  version: z.literal(1),
  showId: z.string().min(1).max(200),
});

export interface EventBriefOptions {
  operatorEmail: string;
  senderEmail: string;
  publicSiteUrl: string;
  privateStoragePath: string;
  hostname: string;
  renderPdf?: (html: string, outputPath: string) => Promise<unknown>;
}

export interface EventBriefPreview {
  html: string;
  text: string;
  pdfPath: string | null;
  revision: number;
}

/** Reloads canonical records, renders the PDF, then atomically queues its operator-only email. */
export class EventBriefService {
  constructor(
    private readonly store: Store,
    private readonly options: EventBriefOptions,
  ) {}

  /** Prepares one show brief idempotently and returns the final email effect identity. */
  async prepare(input: z.infer<typeof EventBriefPreparationSchema>): Promise<{
    effectId: string;
    pdfPath: string;
    mail: MailEffect;
  }> {
    const request = EventBriefPreparationSchema.parse(input);
    const preview = await this.preview(request.showId, { renderPdf: true });
    if (preview.pdfPath === null) {
      throw new Error(`Event brief PDF was not created for ${request.showId}; retry preparation.`);
    }
    const show = this.store.get('shows', request.showId, ShowSchema);
    const effectId = `mail:event-brief:${show.id}:r${show.revision}`;
    const mail = MailEffectSchema.parse({
      version: 1,
      messageId: `<event-brief.${safeId(show.id)}.r${show.revision}@${this.options.hostname}>`,
      envelopeFrom: this.options.senderEmail,
      to: [this.options.operatorEmail],
      cc: [],
      bcc: [],
      replyTo: this.options.senderEmail,
      subject: `[Justin Demo][${show.id}] Private event brief`,
      text: preview.text,
      html: preview.html,
      headers: { 'X-JLM-Show-ID': show.id, 'X-JLM-Document': 'event-brief' },
      attachments: [
        {
          filename: `event-brief-${safeId(show.id)}-r${show.revision}.pdf`,
          path: preview.pdfPath,
          contentType: 'application/pdf',
        },
      ],
    });
    this.store.transaction(() => {
      this.store.enqueue(effectId, 'email.event_brief', show.id, mail);
      this.store.audit('document-worker', 'event_brief.queued', show.id, {
        revision: show.revision,
        effectId,
      });
    });
    return { effectId, pdfPath: preview.pdfPath, mail };
  }

  /** Returns an operator preview without enqueuing email; PDF rendering is explicit and optional. */
  async preview(showId: string, options: { renderPdf?: boolean } = {}): Promise<EventBriefPreview> {
    const show = this.store.get('shows', showId, ShowSchema);
    const inquiry = this.store.get('inquiries', show.data.inquiryId, InquirySchema);
    const customer = this.store.get('customers', show.data.customerId, CustomerSchema);
    const consultation = this.store.get(
      'consultations',
      show.data.consultationId,
      ConsultationSchema,
    );
    const quote =
      show.data.quoteId === null
        ? undefined
        : this.store.find('quotes', show.data.quoteId, QuoteSchema);
    const model = buildEventBriefModel({
      showId: show.id,
      revision: show.revision,
      show: show.data,
      inquiry: inquiry.data,
      customer: customer.data,
      consultation: consultation.data,
      quote: quote?.data,
      operatorUrl: `${this.options.publicSiteUrl}/admin?show=${encodeURIComponent(show.id)}`,
      updatedAt: show.updatedAt,
    });
    const rendered = renderEventBrief(model);
    let pdfPath: string | null = null;
    if (options.renderPdf === true) {
      pdfPath = join(
        this.options.privateStoragePath,
        `event-brief-${safeId(show.id)}-r${show.revision}.pdf`,
      );
      await (this.options.renderPdf ?? renderHtmlPdf)(rendered.html, pdfPath);
    }
    return { ...rendered, pdfPath, revision: show.revision };
  }
}

function buildEventBriefModel(input: {
  showId: string;
  revision: number;
  show: z.infer<typeof ShowSchema>;
  inquiry: z.infer<typeof InquirySchema>;
  customer: z.infer<typeof CustomerSchema>;
  consultation: z.infer<typeof ConsultationSchema>;
  quote: z.infer<typeof QuoteSchema> | undefined;
  operatorUrl: string;
  updatedAt: string;
}): EventBrief {
  const intake = input.inquiry.input;
  const quote = input.quote;
  const price = quote === undefined ? 'To confirm' : formatUsd(quote.totalCents);
  const lineSummary =
    quote === undefined
      ? 'To confirm'
      : quote.lines.map((line) => `${line.quantity} x ${line.description}`).join('; ');
  return {
    showId: input.showId,
    revision: input.revision,
    status: input.show.status.replaceAll('_', ' '),
    eventType: known(input.show.eventType),
    eventDate: formatLocal(input.show.start, input.show.timezone, { dateStyle: 'full' }),
    performanceTime: `${formatLocal(input.show.start, input.show.timezone, { timeStyle: 'short' })}-${formatLocal(input.show.end, input.show.timezone, { timeStyle: 'short' })}`,
    timezone: input.show.timezone,
    venue: known(input.show.venue),
    city: known(input.show.city),
    guestCount: intake.guestCount === null ? 'To confirm' : String(intake.guestCount),
    priceLabel: quote?.kind === 'agreed' ? 'Agreed' : 'Estimate',
    price,
    client: [
      { label: 'Host', value: known(input.customer.name) },
      { label: 'Company', value: known(input.customer.company) },
      { label: 'Preferred contact', value: known(intake.preferredReply) },
      { label: 'Email', value: known(input.customer.email) },
      { label: 'Phone', value: known(input.customer.phone) },
      { label: 'On-site contact', value: 'To confirm' },
    ],
    schedule: [
      {
        label: 'Consultation',
        value: `${formatLocal(input.consultation.start, input.consultation.timezone, { dateStyle: 'medium', timeStyle: 'short' })} (${input.consultation.status})`,
      },
      { label: 'Arrival/load-in', value: 'To confirm' },
      { label: 'Soundcheck', value: 'To confirm' },
      { label: 'Performance', value: known(intake.scheduleNotes) },
      {
        label: 'Finish/curfew',
        value: formatLocal(input.show.end, input.show.timezone, { timeStyle: 'short' }),
      },
    ],
    music: [
      { label: 'Atmosphere', value: known(intake.atmosphere) },
      { label: 'Requests/key moments', value: known(intake.musicRequests) },
      { label: 'Format', value: 'To confirm' },
      { label: 'MC requests', value: 'To confirm' },
    ],
    venueDetails: [
      { label: 'Address', value: known(intake.address) },
      { label: 'Setting', value: known(intake.setting === 'unknown' ? '' : intake.setting) },
      { label: 'Power/PA', value: known(intake.equipment === 'unknown' ? '' : intake.equipment) },
      { label: 'Parking/access', value: known(intake.access === 'unknown' ? '' : intake.access) },
      {
        label: 'Weather cover',
        value: intake.setting === 'outdoor' ? 'To confirm' : 'Not specified',
      },
      { label: 'Insurance/COI', value: 'To confirm' },
    ],
    commercial: [
      {
        label: 'Quote',
        value: quote === undefined ? 'To confirm' : `${quote.kind} v${quote.version}`,
      },
      { label: 'Items', value: lineSummary },
      {
        label: 'Deposit',
        value: quote === undefined ? 'To confirm' : formatUsd(quote.depositCents),
      },
      { label: 'Billing contact', value: known(input.customer.billingEmail) },
      {
        label: 'PO',
        value: input.customer.poRequired ? known(input.customer.poNumber) : 'Not required',
      },
      {
        label: 'Hold expires',
        value: formatLocal(input.show.holdExpiresAt, input.show.timezone, {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      },
    ],
    questions: input.inquiry.followupQuestions,
    lastUpdated: formatLocal(input.updatedAt, input.show.timezone, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }),
    nextAction:
      input.show.status === 'tentative'
        ? 'Complete consultation and approve an agreed quote'
        : 'Review event details',
    operatorUrl: input.operatorUrl,
  };
}

function known(value: string): string {
  return value.trim().length === 0 ? 'To confirm' : value.trim();
}

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)} USD`;
}

function formatLocal(
  instant: string,
  timezone: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: timezone }).format(
    new Date(instant),
  );
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
}
