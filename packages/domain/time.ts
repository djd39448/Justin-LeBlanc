/**
 * Converts local event times and evaluates buffered UTC intervals without hidden timezone guesses.
 *
 * Dependencies: Intl time-zone data from the Node runtime.
 * Depended on by: booking availability, expiry jobs, morning reconciliation, and DST tests.
 * Why this exists: local clock values can be missing or duplicated at DST boundaries.
 */
import { z } from 'zod';

import { InstantSchema, TimezoneSchema } from '../contracts/index.js';

const LocalDateTimeSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use local YYYY-MM-DDTHH:mm format.');
const SEARCH_WINDOW_MINUTES = 16 * 60;

export interface BufferedInterval {
  start: string;
  end: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
}

function localKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes): string => {
    const part = parts.find((candidate) => candidate.type === type);
    if (part === undefined) throw new Error(`Intl omitted ${type} while formatting ${timeZone}.`);
    return part.value;
  };
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`;
}

/**
 * Converts an exact wall-clock value to UTC and rejects missing or ambiguous DST times.
 * Args: local minute string, IANA timezone, optional earlier/later choice for duplicated times.
 * Returns: ISO UTC instant.
 */
export function localDateTimeToInstant(
  rawLocal: string,
  rawTimeZone: string,
  disambiguation: 'reject' | 'earlier' | 'later' = 'reject',
): string {
  const local = LocalDateTimeSchema.parse(rawLocal);
  const timeZone = TimezoneSchema.parse(rawTimeZone);
  const [datePart, timePart] = local.split('T');
  if (datePart === undefined || timePart === undefined) {
    throw new Error('Local time parsing failed after validation; report the input to an operator.');
  }
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new Error('Local time components are incomplete; use YYYY-MM-DDTHH:mm.');
  }
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute);
  const matches: number[] = [];
  for (let offset = -SEARCH_WINDOW_MINUTES; offset <= SEARCH_WINDOW_MINUTES; offset += 15) {
    const candidate = utcGuess + offset * 60_000;
    if (localKey(new Date(candidate), timeZone) === local) matches.push(candidate);
  }
  if (matches.length === 0) {
    throw new Error(
      `Local time ${local} does not exist in ${timeZone}; choose a time outside the DST gap.`,
    );
  }
  if (matches.length > 1 && disambiguation === 'reject') {
    throw new Error(
      `Local time ${local} is ambiguous in ${timeZone}; choose earlier or later explicitly.`,
    );
  }
  const selected = disambiguation === 'later' ? matches.at(-1) : matches[0];
  if (selected === undefined) throw new Error('Timezone conversion produced no candidate.');
  return new Date(selected).toISOString();
}

/** Returns true when intervals overlap after applying each event's own buffers. */
export function bufferedIntervalsOverlap(left: BufferedInterval, right: BufferedInterval): boolean {
  const leftStart = Date.parse(InstantSchema.parse(left.start)) - left.bufferBeforeMinutes * 60_000;
  const leftEnd = Date.parse(InstantSchema.parse(left.end)) + left.bufferAfterMinutes * 60_000;
  const rightStart =
    Date.parse(InstantSchema.parse(right.start)) - right.bufferBeforeMinutes * 60_000;
  const rightEnd = Date.parse(InstantSchema.parse(right.end)) + right.bufferAfterMinutes * 60_000;
  return leftStart < rightEnd && rightStart < leftEnd;
}

/** Formats a UTC instant as a stable local date for deterministic daily-job gates. */
export function localDateForInstant(rawInstant: string, rawTimeZone: string): string {
  const instant = InstantSchema.parse(rawInstant);
  const timeZone = TimezoneSchema.parse(rawTimeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Unable to format ${instant} in ${timeZone}; verify host ICU data.`);
  }
  return `${year}-${month}-${day}`;
}
