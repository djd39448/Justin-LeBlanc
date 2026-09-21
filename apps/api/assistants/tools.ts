/**
 * Defines the public assistant tool allowlist and routes calls through bounded domain operations.
 *
 * Dependencies: Zod and injected booking/knowledge callbacks.
 * Depended on by: OpenAI Responses chat and Retell voice tool endpoints.
 * Why this exists: AI channels must never discover or invoke operator-only business actions.
 */
import { z } from 'zod';

export const PUBLIC_ASSISTANT_TOOL_NAMES = [
  'search_knowledge',
  'upsert_inquiry',
  'estimate_event',
  'get_availability',
  'schedule_consultation_and_hold',
  'request_human_followup',
] as const;
export type PublicAssistantToolName = (typeof PUBLIC_ASSISTANT_TOOL_NAMES)[number];

export interface AssistantToolContext {
  inquiryId: string | null;
  resumeToken: string | null;
  channel: 'chat' | 'voice';
}

export interface AssistantToolHandlers {
  searchKnowledge(args: unknown, context: AssistantToolContext): Promise<unknown>;
  upsertInquiry(args: unknown, context: AssistantToolContext): Promise<unknown>;
  estimateEvent(args: unknown, context: AssistantToolContext): Promise<unknown>;
  getAvailability(args: unknown, context: AssistantToolContext): Promise<unknown>;
  scheduleConsultationAndHold(args: unknown, context: AssistantToolContext): Promise<unknown>;
  requestHumanFollowup(args: unknown, context: AssistantToolContext): Promise<unknown>;
}

const ToolCallSchema = z.object({
  name: z.enum(PUBLIC_ASSISTANT_TOOL_NAMES),
  arguments: z.string().max(20_000),
});

/** Routes one schema-bounded public tool name; operator functions are absent by construction. */
export async function routeAssistantTool(
  rawCall: unknown,
  context: AssistantToolContext,
  handlers: AssistantToolHandlers,
): Promise<unknown> {
  const call = ToolCallSchema.parse(rawCall);
  const args: unknown = JSON.parse(call.arguments);
  switch (call.name) {
    case 'search_knowledge': {
      const result = await handlers.searchKnowledge(args, context);
      const knowledge = z.object({ supported: z.boolean() }).passthrough().safeParse(result);
      if (!knowledge.success || knowledge.data.supported) return result;
      const question = z
        .object({ question: z.string().trim().min(1).max(800) })
        .parse(args).question;
      if (context.inquiryId === null || context.resumeToken === null) {
        return { ...knowledge.data, followup: { status: 'needs_inquiry_association' } };
      }
      const followup = await handlers.requestHumanFollowup({ question }, context);
      return { ...knowledge.data, followup };
    }
    case 'upsert_inquiry':
      return handlers.upsertInquiry(args, context);
    case 'estimate_event':
      return handlers.estimateEvent(args, context);
    case 'get_availability':
      return handlers.getAvailability(args, context);
    case 'schedule_consultation_and_hold':
      return handlers.scheduleConsultationAndHold(args, context);
    case 'request_human_followup':
      return handlers.requestHumanFollowup(args, context);
  }
}

interface FunctionTool {
  type: 'function';
  name: PublicAssistantToolName;
  description: string;
  strict: true;
  parameters: Record<string, unknown>;
}

const objectSchema = (
  properties: Record<string, unknown>,
  required: string[],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

/** Returns strict Responses-compatible schemas for public booking operations only. */
export function publicAssistantTools(): FunctionTool[] {
  const text = { type: 'string', maxLength: 800 };
  return [
    {
      type: 'function',
      name: 'search_knowledge',
      description: 'Search approved business facts and return sources or an explicit unknown.',
      strict: true,
      parameters: objectSchema(
        { question: text, topic: { type: ['string', 'null'], maxLength: 80 } },
        ['question', 'topic'],
      ),
    },
    {
      type: 'function',
      name: 'upsert_inquiry',
      description: 'Create or correct the current session inquiry after consent.',
      strict: true,
      parameters: objectSchema(
        {
          name: { type: 'string', maxLength: 200 },
          email: { type: 'string', maxLength: 254 },
          phone: { type: 'string', maxLength: 30 },
          preferredReply: { type: 'string', enum: ['email', 'phone'] },
          eventType: {
            type: 'string',
            enum: ['private', 'celebration', 'corporate', 'wedding', 'other'],
          },
          date: { type: 'string', maxLength: 20 },
          city: { type: 'string', maxLength: 200 },
          venue: { type: 'string', maxLength: 200 },
          durationMinutes: { type: 'integer', minimum: 30, maximum: 720 },
          timezone: { type: 'string', maxLength: 100 },
          atmosphere: { type: 'string', maxLength: 200 },
          consent: { type: 'boolean' },
        },
        [
          'name',
          'email',
          'phone',
          'preferredReply',
          'eventType',
          'date',
          'city',
          'venue',
          'durationMinutes',
          'timezone',
          'atmosphere',
          'consent',
        ],
      ),
    },
    {
      type: 'function',
      name: 'estimate_event',
      description: 'Calculate the deterministic labeled demo estimate; never invent mileage.',
      strict: true,
      parameters: objectSchema(
        {
          eventType: {
            type: 'string',
            enum: ['private', 'celebration', 'corporate', 'wedding', 'other'],
          },
          durationMinutes: { type: 'integer', minimum: 30, maximum: 720 },
          oneWayMiles: { type: ['number', 'null'], minimum: 0 },
          travelMeasuredBy: {
            type: ['string', 'null'],
            enum: ['operator', 'route_provider', null],
          },
        },
        ['eventType', 'durationMinutes', 'oneWayMiles', 'travelMeasuredBy'],
      ),
    },
    {
      type: 'function',
      name: 'get_availability',
      description:
        'Check only the requested consultation and performance intervals; returns no calendar details.',
      strict: true,
      parameters: objectSchema(
        { consultationStart: text, performanceStart: text, performanceEnd: text },
        ['consultationStart', 'performanceStart', 'performanceEnd'],
      ),
    },
    {
      type: 'function',
      name: 'schedule_consultation_and_hold',
      description:
        'Schedule the reviewed consultation and tentative performance hold for the current inquiry.',
      strict: true,
      parameters: objectSchema(
        {
          consultationStart: text,
          performanceStart: text,
          performanceEnd: text,
          timezone: { type: 'string', maxLength: 100 },
          reviewConsent: { type: 'boolean' },
          requestKey: { type: 'string', minLength: 12, maxLength: 100 },
        },
        [
          'consultationStart',
          'performanceStart',
          'performanceEnd',
          'timezone',
          'reviewConsent',
          'requestKey',
        ],
      ),
    },
    {
      type: 'function',
      name: 'request_human_followup',
      description:
        'Capture an unanswered question for the operator without promising a response time.',
      strict: true,
      parameters: objectSchema({ question: text }, ['question']),
    },
  ];
}
