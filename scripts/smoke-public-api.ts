/**
 * Runs the bounded public API smoke without exposing credentials or synthetic contact details.
 *
 * Dependencies: protected runtime env, public tunnel, Node fetch, Commander, and Zod.
 * Depended on by: live handoff evidence after the tunnel is connected.
 * Usage: npx tsx scripts/smoke-public-api.ts --env <runtime.env> --output <evidence.json>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import { z } from 'zod';

const EnvironmentSchema = z.object({
  API_URL: z.url(),
  PUBLIC_SITE_URL: z.url(),
  CLIENT_TEST_EMAIL: z.email(),
});
const HealthSchema = z.object({
  ok: z.literal(true),
  demo: z.literal(true),
  kbVersion: z.string().min(1),
  kbHash: z.string().regex(/^[0-9a-f]{64}$/),
  capabilities: z.object({
    booking: z.boolean(),
    chat: z.boolean(),
    voice: z.boolean(),
    billing: z.boolean(),
  }),
});
const InquiryReceiptSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(32),
  status: z.literal('new'),
  missingFields: z.array(z.string()),
});
const InquiryInspectionSchema = z.object({
  inquiryId: z.string(),
  status: z.string(),
  input: z.object({ email: z.email(), name: z.string() }).passthrough(),
  shows: z.array(z.unknown()),
});
const ChatResponseSchema = z.object({
  reply: z.string().min(1),
  kbVersion: z.string(),
  kbHash: z.string(),
  conversationId: z.string(),
  conversationToken: z.string().min(32),
  inquiryId: z.string().nullable(),
  token: z.string().nullable(),
});
const ErrorSchema = z.object({ error: z.string() }).passthrough();
const VoiceRejectSchema = z.object({ call_inbound: z.object({ reject: z.literal(true) }) });

interface JsonResponse {
  status: number;
  body: unknown;
}

async function jsonRequest(
  base: URL,
  path: string,
  origin: string,
  init: RequestInit = {},
): Promise<JsonResponse> {
  const response = await fetch(new URL(path, base), {
    ...init,
    headers: {
      Origin: origin,
      ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...init.headers,
    },
    signal: AbortSignal.timeout(20_000),
  });
  const body: unknown = await response.json();
  return { status: response.status, body };
}

function requireStatus(response: JsonResponse, expected: number, step: string): void {
  if (response.status !== expected) {
    throw new Error(`${step} returned HTTP ${response.status}; expected ${expected}.`);
  }
}

async function main(): Promise<void> {
  const options = new Command()
    .name('smoke-public-api')
    .requiredOption('--env <path>', 'Protected runtime env')
    .requiredOption('--output <path>', 'Sanitized evidence JSON path')
    .parse()
    .opts<{ env: string; output: string }>();
  const environment = EnvironmentSchema.parse(parseEnv(readFileSync(options.env, 'utf8')));
  const base = new URL(environment.API_URL);
  const origin = new URL(environment.PUBLIC_SITE_URL).origin;

  const healthResponse = await jsonRequest(base, '/api/health', origin);
  requireStatus(healthResponse, 200, 'health');
  const health = HealthSchema.parse(healthResponse.body);
  if (
    health.capabilities.booking ||
    !health.capabilities.chat ||
    health.capabilities.voice ||
    health.capabilities.billing
  ) {
    throw new Error('Public capability gates do not match the approved smoke configuration.');
  }

  const adminResponse = await jsonRequest(base, '/api/admin/state', origin);
  requireStatus(adminResponse, 401, 'unauthorized admin');
  const adminError = ErrorSchema.parse(adminResponse.body);
  if (adminError.error !== 'unauthorized') throw new Error('Admin route did not fail closed.');

  const inquiryResponse = await jsonRequest(base, '/api/inquiries', origin, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Synthetic Public API Smoke',
      email: environment.CLIENT_TEST_EMAIL,
      preferredReply: 'email',
      eventType: 'private',
      date: 'flexible',
      city: 'Houston',
      durationMinutes: 120,
      timezone: 'America/Chicago',
      atmosphere: 'Warm background music',
      consent: true,
      source: 'form',
    }),
  });
  requireStatus(inquiryResponse, 201, 'inquiry intake');
  const inquiry = InquiryReceiptSchema.parse(inquiryResponse.body);

  const resumeResponse = await jsonRequest(base, `/api/inquiries/${inquiry.id}`, origin, {
    headers: { Authorization: `Bearer ${inquiry.token}` },
  });
  requireStatus(resumeResponse, 200, 'inquiry resume');
  const resume = InquiryInspectionSchema.parse(resumeResponse.body);
  if (
    resume.inquiryId !== inquiry.id ||
    resume.input.email !== environment.CLIENT_TEST_EMAIL ||
    resume.shows.length !== 0
  ) {
    throw new Error('Inquiry resume returned data outside the synthetic inquiry scope.');
  }

  const firstChatResponse = await jsonRequest(base, '/api/chat', origin, {
    method: 'POST',
    body: JSON.stringify({
      message: "Are these demo prices Justin's published rates? State the approved source status.",
      inquiryId: inquiry.id,
      token: inquiry.token,
    }),
  });
  requireStatus(firstChatResponse, 200, 'grounded chat turn one');
  const firstChat = ChatResponseSchema.parse(firstChatResponse.body);
  const pricingGrounded =
    /demo|example/i.test(firstChat.reply) &&
    /not.{0,40}(published|approved)/i.test(firstChat.reply);
  if (!pricingGrounded) throw new Error('Chat turn one did not preserve the pricing disclaimer.');

  const secondChatResponse = await jsonRequest(base, '/api/chat', origin, {
    method: 'POST',
    body: JSON.stringify({
      message: 'Is a tentative hold a confirmed performance, and who can confirm it?',
      conversationId: firstChat.conversationId,
      conversationToken: firstChat.conversationToken,
    }),
  });
  requireStatus(secondChatResponse, 200, 'grounded chat turn two');
  const secondChat = ChatResponseSchema.parse(secondChatResponse.body);
  const confirmationGrounded =
    /not.{0,30}confirmed/i.test(secondChat.reply) &&
    /operator/i.test(secondChat.reply) &&
    /consultation/i.test(secondChat.reply) &&
    /quote/i.test(secondChat.reply);
  if (!confirmationGrounded) {
    throw new Error('Chat turn two did not preserve the operator confirmation boundary.');
  }
  if (
    firstChat.kbHash !== health.kbHash ||
    secondChat.kbHash !== health.kbHash ||
    secondChat.conversationId !== firstChat.conversationId
  ) {
    throw new Error('Chat session or knowledge release changed during the two-turn smoke.');
  }

  const inboundResponse = await jsonRequest(base, '/api/retell/inbound', origin, {
    method: 'POST',
    body: '{}',
  });
  requireStatus(inboundResponse, 200, 'unsigned voice admission');
  VoiceRejectSchema.parse(inboundResponse.body);
  const webhookResponse = await jsonRequest(base, '/api/webhooks/retell', origin, {
    method: 'POST',
    body: '{}',
  });
  requireStatus(webhookResponse, 401, 'unsigned voice webhook');
  const webhookError = ErrorSchema.parse(webhookResponse.body);
  if (webhookError.error !== 'missing_retell_signature') {
    throw new Error('Unsigned Retell webhook did not fail closed.');
  }

  const evidence = {
    checkedAt: new Date().toISOString(),
    apiHost: base.hostname,
    passed: true,
    health: {
      status: healthResponse.status,
      ok: health.ok,
      demo: health.demo,
      kbVersion: health.kbVersion,
      kbHash: health.kbHash,
      capabilities: health.capabilities,
    },
    unauthorizedAdmin: { status: adminResponse.status, error: adminError.error },
    inquiry: {
      intakeStatus: inquiryResponse.status,
      resumeStatus: resumeResponse.status,
      inquiryStatus: inquiry.status,
      scopedResumeMatched: true,
      shows: resume.shows.length,
    },
    chat: {
      actualOpenAiTurns: 2,
      statuses: [firstChatResponse.status, secondChatResponse.status],
      kbVersion: firstChat.kbVersion,
      kbHash: firstChat.kbHash,
      pricingGrounded,
      confirmationGrounded,
    },
    voiceGate: {
      enabled: health.capabilities.voice,
      unsignedInboundStatus: inboundResponse.status,
      unsignedInboundRejected: true,
      unsignedWebhookStatus: webhookResponse.status,
      unsignedWebhookError: webhookError.error,
    },
    providerBusinessWrites: { calendar: false, email: false, voiceCall: false },
  };
  writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(
    `${JSON.stringify({
      passed: true,
      apiHost: evidence.apiHost,
      kbVersion: evidence.health.kbVersion,
      kbHash: evidence.health.kbHash,
      statuses: {
        health: evidence.health.status,
        admin: evidence.unauthorizedAdmin.status,
        intake: evidence.inquiry.intakeStatus,
        resume: evidence.inquiry.resumeStatus,
        chat: evidence.chat.statuses,
        inbound: evidence.voiceGate.unsignedInboundStatus,
        webhook: evidence.voiceGate.unsignedWebhookStatus,
      },
    })}\n`,
  );
}

void main().catch((error: unknown) => {
  const reason = error instanceof Error ? error.message : 'Unknown public API smoke failure.';
  process.stderr.write(`${JSON.stringify({ passed: false, reason })}\n`);
  process.exitCode = 1;
});
