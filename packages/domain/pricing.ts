/**
 * Calculates deterministic demo estimates in integer cents.
 *
 * Dependencies: shared quote contracts for validated line items.
 * Depended on by: public estimate tools, operator quote workflows, and pricing tests.
 * Why this exists: assistants may describe an estimate, but only this module may calculate money.
 */
import { z } from 'zod';

import { LineItemSchema, POLICY_VERSION } from '../contracts/index.js';

const PACKAGE_PRICES = {
  private: { description: 'Private gathering demo package (2 hours)', minutes: 120, cents: 70_000 },
  celebration: {
    description: 'Extended celebration demo package (3 hours)',
    minutes: 180,
    cents: 100_000,
  },
  corporate: {
    description: 'Corporate reception demo package (2 hours)',
    minutes: 120,
    cents: 90_000,
  },
} as const;

const EXTRA_BLOCK_MINUTES = 30;
const EXTRA_BLOCK_CENTS = 17_500;
const INCLUDED_ONE_WAY_MILES = 30;
const EXTRA_MILE_CENTS = 200;

export const EstimateInputSchema = z.object({
  eventType: z.enum(['private', 'celebration', 'corporate', 'wedding', 'other']),
  durationMinutes: z.number().int().min(30).max(720),
  oneWayMiles: z.number().nonnegative().max(2_000).nullable().default(null),
  travelMeasuredBy: z.enum(['operator', 'route_provider']).nullable().default(null),
});
export type EstimateInput = z.infer<typeof EstimateInputSchema>;

export const EstimateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('estimate'),
    currency: z.literal('USD'),
    lines: z.array(LineItemSchema),
    subtotalCents: z.number().int().nonnegative(),
    taxCents: z.literal(0),
    totalCents: z.number().int().nonnegative(),
    policyVersion: z.literal(POLICY_VERSION),
    assumptions: z.array(z.string()),
  }),
  z.object({
    kind: z.literal('custom_quote_required'),
    currency: z.literal('USD'),
    policyVersion: z.literal(POLICY_VERSION),
    reason: z.string(),
    assumptions: z.array(z.string()),
  }),
]);
export type Estimate = z.infer<typeof EstimateSchema>;

/**
 * Calculates the published demo example for supported solo formats.
 * Args: validated event type, duration, and optional measured one-way distance.
 * Returns: itemized integer-cent estimate or an explicit custom-quote result.
 */
export function estimateEvent(rawInput: EstimateInput): Estimate {
  const input = EstimateInputSchema.parse(rawInput);
  if (input.eventType === 'wedding' || input.eventType === 'other') {
    return {
      kind: 'custom_quote_required',
      currency: 'USD',
      policyVersion: POLICY_VERSION,
      reason: 'This event needs a consultation before a price can be calculated.',
      assumptions: ['No price, travel distance, ensemble, or production requirement was inferred.'],
    };
  }

  const selected = PACKAGE_PRICES[input.eventType];
  if (input.durationMinutes < selected.minutes) {
    return {
      kind: 'custom_quote_required',
      currency: 'USD',
      policyVersion: POLICY_VERSION,
      reason: `The ${input.eventType} demo package starts at ${selected.minutes} minutes.`,
      assumptions: ['Shorter-format pricing requires operator review.'],
    };
  }

  const lines: z.infer<typeof LineItemSchema>[] = [
    { description: selected.description, quantity: 1, unitCents: selected.cents },
  ];
  const extraMinutes = input.durationMinutes - selected.minutes;
  if (extraMinutes % EXTRA_BLOCK_MINUTES !== 0) {
    return {
      kind: 'custom_quote_required',
      currency: 'USD',
      policyVersion: POLICY_VERSION,
      reason: 'Extra performance time must be agreed in 30-minute blocks.',
      assumptions: ['The requested duration was not rounded or repriced automatically.'],
    };
  }
  if (extraMinutes > 0) {
    lines.push({
      description: 'Additional performance time (30-minute block)',
      quantity: extraMinutes / EXTRA_BLOCK_MINUTES,
      unitCents: EXTRA_BLOCK_CENTS,
    });
  }

  const assumptions = [
    "Illustrative demo pricing only; these are not Justin's published or approved rates.",
    'Tax is set to $0 for the demo and is not tax advice.',
    'Complex production, multiple locations, and ensembles require a custom quote.',
  ];
  if (input.oneWayMiles === null) {
    assumptions.push('Travel is unresolved; no mileage charge was invented.');
  } else {
    if (input.travelMeasuredBy === null) {
      return {
        kind: 'custom_quote_required',
        currency: 'USD',
        policyVersion: POLICY_VERSION,
        reason: 'Travel distance must be measured by an operator or route provider.',
        assumptions: ['A city name alone is not used to invent mileage.'],
      };
    }
    const excessMiles = Math.max(0, Math.ceil(input.oneWayMiles - INCLUDED_ONE_WAY_MILES));
    if (excessMiles > 0) {
      lines.push({
        description: 'One-way travel beyond included 30 miles',
        quantity: excessMiles,
        unitCents: EXTRA_MILE_CENTS,
      });
    }
    assumptions.push(
      `One-way distance was ${input.oneWayMiles} miles, supplied by ${input.travelMeasuredBy}.`,
    );
  }

  const subtotalCents = lines.reduce((total, line) => total + line.quantity * line.unitCents, 0);
  return EstimateSchema.parse({
    kind: 'estimate',
    currency: 'USD',
    lines,
    subtotalCents,
    taxCents: 0,
    totalCents: subtotalCents,
    policyVersion: POLICY_VERSION,
    assumptions,
  });
}
