import { z } from 'zod';

export const PHONE_VALIDATION_MESSAGE =
  'Enter a complete 10-digit phone number or clear this field.';

/** Preserves entered formatting while enforcing the narrow US phone boundary. */
export const PhoneSchema = z
  .string()
  .trim()
  .max(30, { message: PHONE_VALIDATION_MESSAGE })
  .superRefine((value, ctx) => {
    if (value.length === 0) return;
    const digits = value.replace(/[() .-]/g, '').replace(/^\+1/, '1');
    if (!/^\d+$/.test(digits) || (digits.length !== 10 && !(digits.length === 11 && digits[0] === '1')))
      ctx.addIssue({ code: 'custom', message: PHONE_VALIDATION_MESSAGE });
  });
