/** Verifies token scope, SQL hold races, and operator-only booking transitions offline. */
import { describe, expect, it } from 'vitest';

import { Store } from '../apps/api/store.js';
import {
  ConsultationSchema,
  QuoteSchema,
  ShowSchema,
  type InquiryInput,
} from '../packages/contracts/index.js';
import { BookingService, type AvailabilityProvider } from '../packages/domain/booking.js';

const inquiryInput = (email: string): InquiryInput => ({
  name: 'Synthetic Client',
  email,
  phone: '',
  preferredReply: 'email',
  company: '',
  eventType: 'private',
  date: '2026-11-14',
  city: 'Houston',
  venue: 'Demo Venue',
  address: '',
  setting: 'indoor',
  guestCount: 50,
  startLocal: '',
  endLocal: '',
  durationMinutes: 120,
  timezone: 'America/Chicago',
  atmosphere: 'Warm and welcoming',
  musicRequests: '',
  scheduleNotes: '',
  equipment: 'unknown',
  access: 'unknown',
  budget: 'unsure',
  notes: '',
  consent: true,
  marketingConsent: false,
  source: 'form',
  utm: {},
});

class OpenAvailability implements AvailabilityProvider {
  async busy(): Promise<[]> {
    return [];
  }
}

class BarrierAvailability implements AvailabilityProvider {
  private calls = 0;
  private release: (() => void) | undefined;
  private readonly gate = new Promise<void>((resolve) => {
    this.release = resolve;
  });

  async busy(): Promise<[]> {
    this.calls += 1;
    if (this.calls === 2) {
      const release = this.release;
      if (release === undefined) throw new Error('Barrier release was not initialized.');
      release();
    }
    await this.gate;
    return [];
  }
}

const createService = (store: Store, availability: AvailabilityProvider = new OpenAvailability()) =>
  new BookingService(store, availability, {
    operatorEmail: 'operator@example.test',
    performerEmail: 'performer@example.test',
  });

describe('BookingService inquiry authorization', () => {
  it('updates and inspects only with the opaque resume token', () => {
    const store = new Store(':memory:');
    const service = createService(store);
    const receipt = service.upsertInquiry({ input: inquiryInput('client@example.test') });
    expect(() => service.inspectInquiry(receipt.inquiryId, 'x'.repeat(43))).toThrow(
      'authorization failed',
    );
    const updated = service.upsertInquiry({
      inquiryId: receipt.inquiryId,
      resumeToken: receipt.resumeToken,
      input: { ...inquiryInput('corrected@example.test'), city: 'Katy' },
    });
    expect(updated.inquiryId).toBe(receipt.inquiryId);
    expect(service.inspectInquiry(receipt.inquiryId, receipt.resumeToken).input.city).toBe('Katy');
    store.close();
  });
});

describe('BookingService hold race', () => {
  it('allows at most one active buffered hold after simultaneous free/busy checks', async () => {
    const store = new Store(':memory:');
    const service = createService(store, new BarrierAvailability());
    const first = service.upsertInquiry({ input: inquiryInput('first@example.test') });
    const second = service.upsertInquiry({ input: inquiryInput('second@example.test') });
    const base = {
      performanceStart: '2026-11-14T20:00:00.000Z',
      performanceEnd: '2026-11-14T22:00:00.000Z',
      timezone: 'America/Chicago',
      reviewConsent: true as const,
    };
    const results = await Promise.allSettled([
      service.scheduleConsultationAndHold({
        ...base,
        inquiryId: first.inquiryId,
        token: first.resumeToken,
        requestKey: 'request-first-0001',
        consultationStart: '2026-10-01T14:00:00.000Z',
      }),
      service.scheduleConsultationAndHold({
        ...base,
        inquiryId: second.inquiryId,
        token: second.resumeToken,
        requestKey: 'request-second-0002',
        consultationStart: '2026-10-02T14:00:00.000Z',
      }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect(store.all('shows', ShowSchema)).toHaveLength(1);
    expect(store.effects().filter((effect) => effect.kind === 'calendar.upsert')).toHaveLength(2);
    store.close();
  });
});

describe('BookingService operator transitions', () => {
  it('requires completed consultation and approved quote, then cancels only the owned show', async () => {
    const store = new Store(':memory:');
    const service = createService(store);
    const inquiry = service.upsertInquiry({ input: inquiryInput('client@example.test') });
    const scheduled = await service.scheduleConsultationAndHold({
      inquiryId: inquiry.inquiryId,
      token: inquiry.resumeToken,
      requestKey: 'request-confirm-0001',
      consultationStart: '2026-10-01T14:00:00.000Z',
      performanceStart: '2026-11-14T20:00:00.000Z',
      performanceEnd: '2026-11-14T22:00:00.000Z',
      timezone: 'America/Chicago',
      reviewConsent: true,
    });
    const quote = service.approveAgreedQuote({
      showId: scheduled.showId,
      lines: [{ description: 'Approved performance', quantity: 1, unitCents: 70_000 }],
      actor: 'operator:test',
      requestKey: 'quote-confirm-0001',
    });
    const replayedQuote = service.approveAgreedQuote({
      showId: scheduled.showId,
      lines: [{ description: 'Approved performance', quantity: 1, unitCents: 70_000 }],
      actor: 'operator:test',
      requestKey: 'quote-confirm-0001',
    });
    expect(replayedQuote.id).toBe(quote.id);
    const show = store.get('shows', scheduled.showId, ShowSchema);
    await expect(
      service.confirmShow({
        showId: show.id,
        showRevision: show.revision,
        quoteId: quote.id,
        quoteRevision: quote.revision,
        actor: 'operator:test',
        requestKey: 'confirm-show-0001',
      }),
    ).rejects.toThrow('Consultation must be completed');
    const consultation = store.get('consultations', scheduled.consultationId, ConsultationSchema);
    service.completeConsultation(consultation.id, consultation.revision, 'operator:test');
    const confirmed = await service.confirmShow({
      showId: show.id,
      showRevision: show.revision,
      quoteId: quote.id,
      quoteRevision: quote.revision,
      actor: 'operator:test',
      requestKey: 'confirm-show-0001',
    });
    expect(confirmed.data.status).toBe('confirmed');
    expect(store.get('quotes', quote.id, QuoteSchema).data.totalCents).toBe(70_000);
    const replayedConfirmation = await service.confirmShow({
      showId: show.id,
      showRevision: show.revision,
      quoteId: quote.id,
      quoteRevision: quote.revision,
      actor: 'operator:test',
      requestKey: 'confirm-show-0001',
    });
    expect(replayedConfirmation.id).toBe(confirmed.id);
    const amendedQuote = service.approveAgreedQuote({
      showId: confirmed.id,
      lines: [{ description: 'Approved performance', quantity: 1, unitCents: 75_000 }],
      actor: 'operator:test',
      requestKey: 'quote-amend-0002',
    });
    expect(amendedQuote.data.version).toBe(2);
    const amendedShow = store.get('shows', confirmed.id, ShowSchema);
    expect(amendedShow.data.quoteId).toBe(amendedQuote.id);
    expect(() =>
      service.cancelShow(amendedShow.id, amendedShow.revision, 'public_token', 'wrong-token-value'),
    ).toThrow('authorization failed');
    const cancelled = service.cancelShow(
      amendedShow.id,
      amendedShow.revision,
      'public_token',
      inquiry.resumeToken,
    );
    expect(cancelled.data.status).toBe('cancelled');
    store.close();
  });

  it('expires a tentative hold once and queues one provider cancellation', async () => {
    const store = new Store(':memory:');
    const service = createService(store);
    const inquiry = service.upsertInquiry({ input: inquiryInput('expiry@example.test') });
    const scheduled = await service.scheduleConsultationAndHold({
      inquiryId: inquiry.inquiryId,
      token: inquiry.resumeToken,
      requestKey: 'request-expiry-0001',
      consultationStart: '2026-10-01T14:00:00.000Z',
      performanceStart: '2026-11-14T20:00:00.000Z',
      performanceEnd: '2026-11-14T22:00:00.000Z',
      timezone: 'America/Chicago',
      reviewConsent: true,
    });
    expect(service.expireHolds('2026-10-04T15:00:00.000Z')).toEqual([scheduled.showId]);
    expect(service.expireHolds('2026-10-04T16:00:00.000Z')).toEqual([]);
    expect(store.effects().filter((effect) => effect.kind === 'calendar.cancel')).toHaveLength(1);
    store.close();
  });
});
