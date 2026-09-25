/** Validates shared booking records. Dependencies: Zod. Consumers: API, domain, documents.
 * Why: every channel uses identical bounded data and explicit demo assumptions. */
import { z } from 'zod';
import { PhoneSchema } from './phone.js';

export const TENANT = 'justin-demo';
export const POLICY_VERSION = 'demo-2026-09-21.1';
const short = z.string().trim().max(200);
const note = z.string().trim().max(800);
export const MAX_BUDGET_CENTS = 9_999_999_999;
export const BudgetCentsSchema = z
  .number()
  .int()
  .min(0)
  .max(MAX_BUDGET_CENTS)
  .nullable()
  .default(null);
export const InstantSchema = z.iso.datetime({ offset: true });
export const TimezoneSchema = z.string().refine((value) => {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, 'Use a valid IANA timezone.');
export const InquiryInputSchema = z
  .object({
    name: short.min(1),
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    phone: PhoneSchema.default(''),
    preferredReply: z.enum(['email', 'text', 'phone']).default('email'),
    company: short.default(''),
    eventType: z.enum(['private', 'celebration', 'corporate', 'wedding', 'other']),
    date: z.union([z.iso.date(), z.literal('flexible')]),
    city: short.min(1),
    venue: short.default(''),
    address: short.default(''),
    setting: z.enum(['indoor', 'outdoor', 'unknown']).default('unknown'),
    guestCount: z.number().int().min(1).max(10000).nullable().default(null),
    startLocal: short.default(''),
    endLocal: short.default(''),
    durationMinutes: z.number().int().min(30).max(720),
    timezone: TimezoneSchema.default('America/Chicago'),
    atmosphere: short.min(1),
    musicRequests: note.default(''),
    scheduleNotes: note.default(''),
    equipment: note.default('unknown'),
    access: note.default('unknown'),
    budget: short.default('unsure'),
    budgetCents: BudgetCentsSchema,
    notes: note.default(''),
    consent: z.literal(true),
    marketingConsent: z.boolean().default(false),
    source: z.enum(['form', 'chat', 'voice', 'operator']).default('form'),
    utm: z
      .object({ source: short.optional(), medium: short.optional(), campaign: short.optional() })
      .default({}),
  })
  ;
/** Canonical parsed inquiry shape; raw JSON may omit budgetCents and receives the null default. */
export type InquiryInput = z.infer<typeof InquiryInputSchema>;
/** Historical rows may contain legacy phone text; new writes remain strict. */
export const InquiryStoredInputSchema = InquiryInputSchema.safeExtend({
  phone: z.string().trim().max(30).default(''),
});
export type InquiryStoredInput = z.infer<typeof InquiryStoredInputSchema>;
export const CustomerSchema = z.object({
  name: short.min(1),
  email: z.email(),
  phone: short.default(''),
  company: short.default(''),
  billingName: short.default(''),
  billingEmail: z.union([z.email(), z.literal('')]).default(''),
  billingAddress: note.default(''),
  poRequired: z.boolean().default(false),
  poNumber: short.default(''),
});
export type Customer = z.infer<typeof CustomerSchema>;
export const InquirySchema = z.object({
  customerId: z.string(),
  input: InquiryStoredInputSchema,
  status: z.enum(['new', 'qualified', 'consultation_scheduled', 'consultation_completed']),
  tokenHash: z.string(),
  followupQuestions: z.array(note).default([]),
  followUp: z
    .object({
      receivedAt: InstantSchema,
      dueAt: InstantSchema,
      initialAlertQueuedAt: InstantSchema.nullable().default(null),
      followedUpAt: InstantSchema.nullable().default(null),
      reminder20QueuedAt: InstantSchema.nullable().default(null),
      overdue24QueuedAt: InstantSchema.nullable().default(null),
    })
    .optional(),
});
export type Inquiry = z.infer<typeof InquirySchema>;
export const LineItemSchema = z.object({
  description: short.min(1),
  quantity: z.number().int().min(1).max(1000),
  unitCents: z.number().int().min(0).max(10000000),
});
export const QuoteSchema = z.object({
  showId: z.string(),
  version: z.number().int().positive(),
  kind: z.enum(['estimate', 'agreed']),
  currency: z.literal('USD'),
  lines: z.array(LineItemSchema).min(1).max(30),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.literal(0),
  depositCents: z.number().int().nonnegative().default(0),
  totalCents: z.number().int().nonnegative(),
  policyVersion: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: InstantSchema.nullable(),
});
export type Quote = z.infer<typeof QuoteSchema>;
export const ShowSchema = z.object({
  inquiryId: z.string(),
  customerId: z.string(),
  eventType: short,
  venue: short,
  city: short,
  start: InstantSchema,
  end: InstantSchema,
  timezone: TimezoneSchema,
  bufferBeforeMinutes: z.number().int().nonnegative().default(120),
  bufferAfterMinutes: z.number().int().nonnegative().default(90),
  status: z.enum([
    'tentative',
    'confirmed',
    'awaiting_performance_reply',
    'performed',
    'not_performed',
    'needs_review',
    'expired',
    'cancelled',
  ]),
  holdExpiresAt: InstantSchema,
  quoteId: z.string().nullable(),
  consultationId: z.string(),
  synthetic: z.boolean().default(false),
});
export type Show = z.infer<typeof ShowSchema>;
export const ConsultationSchema = z.object({
  inquiryId: z.string(),
  showId: z.string(),
  start: InstantSchema,
  end: InstantSchema,
  timezone: TimezoneSchema,
  status: z.enum(['scheduled', 'completed', 'cancelled']),
});
export const CalendarLinkSchema = z.object({
  showId: z.string(),
  role: z.enum(['consultation', 'performance', 'buffer']),
  eventId: z.string(),
  calendarId: z.string(),
  etag: z.string(),
  syncState: z.enum(['pending', 'synced', 'failed']),
});
export const ScheduleInputSchema = z.object({
  inquiryId: z.string(),
  token: z.string().min(32),
  requestKey: z.string().min(12).max(100),
  consultationStart: InstantSchema,
  performanceStart: InstantSchema,
  performanceEnd: InstantSchema,
  timezone: TimezoneSchema,
  reviewConsent: z.literal(true),
});
export type ScheduleInput = z.infer<typeof ScheduleInputSchema>;
export interface Entity<T> {
  id: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
  data: T;
}
export const TableSchema = z.enum([
  'customers',
  'inquiries',
  'shows',
  'consultations',
  'quotes',
  'calendar_links',
  'conversations',
  'performance_checks',
  'invoices',
  'processed_events',
  'job_runs',
  'audit_events',
]);
export type Table = z.infer<typeof TableSchema>;
