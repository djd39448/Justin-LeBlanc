import { describe, expect, it } from 'vitest';

import {
  formatInquiryDate,
  insertDateDashes,
  parseInquiryDate,
} from '../apps/web/src/lib/inquiry-date.js';

describe('inquiry date input', () => {
  it('inserts dashes and expands two digit years', () => {
    expect(insertDateDashes('01022026')).toBe('01-02-2026');
    expect(parseInquiryDate('01-02-26')).toBe('2026-01-02');
    expect(parseInquiryDate('01-02-2026')).toBe('2026-01-02');
  });
  it('rejects impossible dates and honors leap years', () => {
    expect(parseInquiryDate('02-29-2024')).toBe('2024-02-29');
    expect(parseInquiryDate('02-29-2025')).toBeNull();
    expect(parseInquiryDate('04-31-2026')).toBeNull();
  });
  it('formats ISO values for the visible field', () => {
    expect(formatInquiryDate('2026-11-14')).toBe('11-14-2026');
  });
});
