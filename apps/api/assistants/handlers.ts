/**
 * Connects public assistant tools to knowledge, pricing, and booking domain services.
 *
 * Dependencies: Store, BookingService, canonical KB release, Zod, and pure pricing.
 * Depended on by: chat and signed Retell tool routes.
 * Why this exists: session-owned credentials stay server-side and never enter model tool output.
 */
import { z } from 'zod';

import { type KnowledgeRelease, searchKnowledge } from '../../../kb/release.js';
import {
  InquiryInputSchema,
  InstantSchema,
  TimezoneSchema,
} from '../../../packages/contracts/index.js';
import { BookingService } from '../../../packages/domain/booking.js';
import { EstimateInputSchema, estimateEvent } from '../../../packages/domain/pricing.js';
import { localDateTimeToInstant } from '../../../packages/domain/time.js';
import { Store } from '../store.js';

import type { AssistantToolContext, AssistantToolHandlers } from './tools.js';

const SearchArgsSchema = z.object({
  question: z.string().trim().min(1).max(800),
  topic: z.string().trim().min(1).max(80).nullable(),
});
const AvailabilityArgsSchema = z.object({
  consultationStart: z.string(),
  performanceStart: z.string(),
  performanceEnd: z.string(),
});
const ScheduleArgsSchema = AvailabilityArgsSchema.extend({
  timezone: TimezoneSchema,
  reviewConsent: z.literal(true),
  requestKey: z.string().min(12).max(100),
});
const FollowupArgsSchema = z.object({ question: z.string().trim().min(1).max(800) });
const AssistantInquiryArgsSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  preferredReply: z.enum(['email', 'phone']),
  eventType: z.enum(['private', 'celebration', 'corporate', 'wedding', 'other']),
  date: z.string(),
  city: z.string(),
  venue: z.string(),
  durationMinutes: z.number(),
  timezone: z.string(),
  atmosphere: z.string(),
  consent: z.literal(true),
});
const assistantLocalDateTimePattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::([0-5]\d))?$/;
const AssistantLocalDateTimeSchema = z
  .string()
  .regex(
    assistantLocalDateTimePattern,
    'Use an ISO instant with an offset or local YYYY-MM-DDTHH:mm[:ss].',
  );

/** Converts strict assistant-local clock input without relying on the host timezone. */
function normalizeAssistantInstant(raw: string, timezone: string): string {
  const instant = InstantSchema.safeParse(raw);
  if (instant.success) return instant.data;
  const local = AssistantLocalDateTimeSchema.parse(raw);
  const match = assistantLocalDateTimePattern.exec(local);
  if (match === null || match[1] === undefined) {
    throw new Error('Assistant local time did not match its validated format.');
  }
  const minuteInstant = localDateTimeToInstant(match[1], timezone);
  const seconds = Number(match[2] ?? '0');
  return new Date(Date.parse(minuteInstant) + seconds * 1000).toISOString();
}

function normalizeAvailabilityTimes(
  args: z.infer<typeof AvailabilityArgsSchema>,
  timezone: string,
): z.infer<typeof AvailabilityArgsSchema> {
  return {
    consultationStart: normalizeAssistantInstant(args.consultationStart, timezone),
    performanceStart: normalizeAssistantInstant(args.performanceStart, timezone),
    performanceEnd: normalizeAssistantInstant(args.performanceEnd, timezone),
  };
}

function requireAssociation(context: AssistantToolContext): {
  inquiryId: string;
  resumeToken: string;
} {
  if (context.inquiryId === null || context.resumeToken === null) {
    throw new Error('This session is not associated with an inquiry; call upsert_inquiry first.');
  }
  return { inquiryId: context.inquiryId, resumeToken: context.resumeToken };
}

/** Builds handlers whose mutable context is controlled by the server conversation/call session. */
export function createAssistantHandlers(
  store: Store,
  booking: BookingService,
  release: KnowledgeRelease,
): AssistantToolHandlers {
  void store;
  return {
    async searchKnowledge(rawArgs) {
      const args = SearchArgsSchema.parse(rawArgs);
      return searchKnowledge(release, args.question, args.topic === null ? undefined : args.topic);
    },
    async upsertInquiry(rawArgs, context) {
      const args = AssistantInquiryArgsSchema.parse(rawArgs);
      const input = InquiryInputSchema.parse({
        ...args,
        company: '',
        address: '',
        setting: 'unknown',
        guestCount: null,
        startLocal: '',
        endLocal: '',
        musicRequests: '',
        scheduleNotes: '',
        equipment: 'unknown',
        access: 'unknown',
        budget: 'unsure',
        budgetCents: null,
        notes: '',
        marketingConsent: false,
        source: context.channel,
        utm: {},
      });
      const receipt = booking.upsertInquiry({
        input,
        inquiryId: context.inquiryId === null ? undefined : context.inquiryId,
        resumeToken: context.resumeToken === null ? undefined : context.resumeToken,
      });
      context.inquiryId = receipt.inquiryId;
      context.resumeToken = receipt.resumeToken;
      return { inquiryId: receipt.inquiryId, status: receipt.status };
    },
    async estimateEvent(rawArgs) {
      return estimateEvent(EstimateInputSchema.parse(rawArgs));
    },
    async getAvailability(rawArgs) {
      const args = AvailabilityArgsSchema.parse(rawArgs);
      return booking.getAvailability(normalizeAvailabilityTimes(args, 'America/Chicago'));
    },
    async scheduleConsultationAndHold(rawArgs, context) {
      const association = requireAssociation(context);
      const args = ScheduleArgsSchema.parse(rawArgs);
      const times = normalizeAvailabilityTimes(args, args.timezone);
      return booking.scheduleConsultationAndHold({
        ...args,
        ...times,
        inquiryId: association.inquiryId,
        token: association.resumeToken,
      });
    },
    async requestHumanFollowup(rawArgs, context) {
      const association = requireAssociation(context);
      const args = FollowupArgsSchema.parse(rawArgs);
      return booking.requestHumanFollowup(
        association.inquiryId,
        association.resumeToken,
        args.question,
        context.channel,
      );
    },
  };
}
