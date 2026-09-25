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
    const compact = value.replace(/[() .-]/g, '');
    const valid = compact.startsWith('+1')
      ? /^\+1\d{10}$/.test(compact)
      : /^\d{10}$/.test(compact) || /^1\d{10}$/.test(compact);
    if (!valid)
      ctx.addIssue({ code: 'custom', message: PHONE_VALIDATION_MESSAGE });
  });
