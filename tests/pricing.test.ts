/** Verifies deterministic demo pricing boundaries. Depends on Vitest and pricing domain logic. */
import { describe, expect, it } from 'vitest';

import { estimateEvent } from '../packages/domain/pricing.js';

describe('estimateEvent', () => {
  it('uses integer cents for base, extra time, and measured travel', () => {
    const result = estimateEvent({
      eventType: 'private',
      durationMinutes: 150,
      oneWayMiles: 42.2,
      travelMeasuredBy: 'route_provider',
    });
    expect(result.kind).toBe('estimate');
    if (result.kind !== 'estimate') throw new Error('Expected an estimate fixture.');
    expect(result.lines).toEqual([
      { description: 'Private gathering demo package (2 hours)', quantity: 1, unitCents: 70_000 },
      {
        description: 'Additional performance time (30-minute block)',
        quantity: 1,
        unitCents: 17_500,
      },
      { description: 'One-way travel beyond included 30 miles', quantity: 13, unitCents: 200 },
    ]);
    expect(result.totalCents).toBe(90_100);
  });

  it('does not invent travel charges when distance is unknown', () => {
    const result = estimateEvent({
      eventType: 'corporate',
      durationMinutes: 120,
      oneWayMiles: null,
      travelMeasuredBy: null,
    });
    expect(result.kind).toBe('estimate');
    if (result.kind !== 'estimate') throw new Error('Expected an estimate fixture.');
    expect(result.totalCents).toBe(90_000);
    expect(result.assumptions).toContain('Travel is unresolved; no mileage charge was invented.');
  });

  it('requires a custom quote for weddings and non-block extra time', () => {
    expect(
      estimateEvent({
        eventType: 'wedding',
        durationMinutes: 120,
        oneWayMiles: null,
        travelMeasuredBy: null,
      }).kind,
    ).toBe('custom_quote_required');
    expect(
      estimateEvent({
        eventType: 'private',
        durationMinutes: 135,
        oneWayMiles: null,
        travelMeasuredBy: null,
      }).kind,
    ).toBe('custom_quote_required');
  });
});
