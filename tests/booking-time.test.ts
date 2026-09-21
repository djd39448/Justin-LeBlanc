/** Verifies DST conversion and buffered overlap rules. Depends on Vitest and domain time helpers. */
import { describe, expect, it } from 'vitest';

import { bufferedIntervalsOverlap, localDateTimeToInstant } from '../packages/domain/time.js';

describe('localDateTimeToInstant', () => {
  it('rejects a nonexistent spring-forward time', () => {
    expect(() => localDateTimeToInstant('2026-03-08T02:30', 'America/Chicago')).toThrow(
      'does not exist',
    );
  });

  it('requires explicit choice for a duplicated fall-back time', () => {
    expect(() => localDateTimeToInstant('2026-11-01T01:30', 'America/Chicago')).toThrow(
      'ambiguous',
    );
    expect(localDateTimeToInstant('2026-11-01T01:30', 'America/Chicago', 'earlier')).toBe(
      '2026-11-01T06:30:00.000Z',
    );
    expect(localDateTimeToInstant('2026-11-01T01:30', 'America/Chicago', 'later')).toBe(
      '2026-11-01T07:30:00.000Z',
    );
  });
});

describe('bufferedIntervalsOverlap', () => {
  it('treats a setup buffer as occupied while allowing exact non-overlap', () => {
    const held = {
      start: '2026-11-14T20:00:00.000Z',
      end: '2026-11-14T22:00:00.000Z',
      bufferBeforeMinutes: 120,
      bufferAfterMinutes: 90,
    };
    expect(
      bufferedIntervalsOverlap(held, {
        start: '2026-11-14T16:30:00.000Z',
        end: '2026-11-14T18:30:00.000Z',
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }),
    ).toBe(true);
    expect(
      bufferedIntervalsOverlap(held, {
        start: '2026-11-14T16:00:00.000Z',
        end: '2026-11-14T18:00:00.000Z',
        bufferBeforeMinutes: 0,
        bufferAfterMinutes: 0,
      }),
    ).toBe(false);
  });
});
