/**
 * Mounts signed Retell lifecycle and custom-tool endpoints for the isolated voice agent.
 *
 * Dependencies: Hono, runtime services, Retell signature verification, and public tool routing.
 * Depended on by: API composition in app.ts.
 * Why this exists: Retell envelopes need raw-body auth and call-scoped server credentials.
 */
import { createHash } from 'node:crypto';

import type { Hono } from 'hono';
import { z } from 'zod';

import {
  RetellCallAdmissionError,
  RetellCallSessionLedger,
  RetellWebhookSchema,
  verifyRetellSignature,
} from './assistants/retell.js';
import {
  PUBLIC_ASSISTANT_TOOL_NAMES,
  routeAssistantTool,
  type AssistantToolContext,
} from './assistants/tools.js';
import type { Config } from './config.js';
import type { Runtime } from './runtime.js';

const RetellToolEnvelopeSchema = z.object({
  name: z.enum(PUBLIC_ASSISTANT_TOOL_NAMES),
  call: z
    .object({
      call_id: z.string().min(1).max(200),
      agent_id: z.string().min(1).max(200),
    })
    .passthrough(),
  args: z.record(z.string(), z.unknown()),
});
const ProcessedWebhookSchema = z.object({
  kind: z.literal('retell_webhook'),
  event: RetellWebhookSchema.shape.event,
  callId: z.string(),
});
const ProcessedToolSchema = z.object({
  kind: z.literal('retell_tool'),
  callId: z.string(),
  name: z.enum(PUBLIC_ASSISTANT_TOOL_NAMES),
  result: z.json(),
});

export type RetellRequestVerifier = (
  rawBody: Uint8Array,
  signature: string,
  config: Config,
) => Promise<boolean>;

export interface VoiceRouteOptions {
  verifySignature?: RetellRequestVerifier;
}

const defaultVerifier: RetellRequestVerifier = async (rawBody, signature, config) => {
  await verifyRetellSignature(rawBody, signature, config);
  return true;
};

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function parseJson(text: string): unknown | undefined {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** Adds raw-body authenticated Retell routes to the supplied application. */
export function mountVoiceRoutes(
  app: Hono,
  runtime: Runtime,
  options: VoiceRouteOptions = {},
): void {
  const ledger = new RetellCallSessionLedger(runtime.store);
  const verifier =
    options.verifySignature === undefined ? defaultVerifier : options.verifySignature;

  app.post('/api/webhooks/retell', async (context) => {
    const verified = await readVerifiedRetellBody(context.req.raw, runtime.config, verifier);
    if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);
    const eventResult = RetellWebhookSchema.safeParse(parseJson(verified.text));
    if (!eventResult.success) return jsonResponse({ error: 'invalid_retell_webhook' }, 400);
    const event = eventResult.data;
    if (event.call.agent_id !== runtime.config.RETELL_JLM_AGENT_ID) {
      return jsonResponse({ error: 'wrong_retell_agent' }, 403);
    }
    if (!runtime.config.VOICE_ENABLED) return jsonResponse({ error: 'voice_disabled' }, 503);

    try {
      if (event.event === 'call_started') {
        ledger.beginVerifiedCall(event, runtime.knowledge);
      } else if (event.event === 'call_ended') {
        ledger.endVerifiedCall(event.call.call_id);
      }
    } catch (error) {
      if (error instanceof RetellCallAdmissionError) {
        return jsonResponse({ error: error.code }, 429);
      }
      throw error;
    }
    const processedId = `retell-webhook:${event.event}:${event.call.call_id}`;
    const prior = runtime.store.find('processed_events', processedId, ProcessedWebhookSchema);
    if (prior === undefined) {
      runtime.store.transaction(() => {
        runtime.store.insert('processed_events', processedId, {
          kind: 'retell_webhook',
          event: event.event,
          callId: event.call.call_id,
        });
        runtime.store.audit('retell:verified', `retell.${event.event}`, event.call.call_id, {});
      });
    }
    return jsonResponse({ received: true, replayed: prior !== undefined });
  });

  app.post('/api/retell/tools', async (context) => {
    const verified = await readVerifiedRetellBody(context.req.raw, runtime.config, verifier);
    if (!verified.ok) return jsonResponse({ error: verified.error }, verified.status);
    const envelopeResult = RetellToolEnvelopeSchema.safeParse(parseJson(verified.text));
    if (!envelopeResult.success)
      return jsonResponse({ error: 'invalid_retell_tool_envelope' }, 400);
    const envelope = envelopeResult.data;
    if (envelope.call.agent_id !== runtime.config.RETELL_JLM_AGENT_ID) {
      return jsonResponse({ error: 'wrong_retell_agent' }, 403);
    }
    if (!runtime.config.VOICE_ENABLED) return jsonResponse({ error: 'voice_disabled' }, 503);

    const replayId = `retell-tool:${createHash('sha256').update(verified.text).digest('hex')}`;
    const replay = runtime.store.find('processed_events', replayId, ProcessedToolSchema);
    if (replay !== undefined) return jsonResponse({ result: replay.data.result, replayed: true });

    let toolContext: AssistantToolContext;
    try {
      toolContext = ledger.contextForVerifiedCall(envelope.call.call_id);
    } catch {
      return jsonResponse({ error: 'retell_call_not_admitted' }, 409);
    }
    const rawResult = await routeAssistantTool(
      { name: envelope.name, arguments: JSON.stringify(envelope.args) },
      toolContext,
      runtime.handlers,
    );
    const result = z.json().parse(rawResult);
    runtime.store.transaction(() => {
      runtime.store.insert('processed_events', replayId, {
        kind: 'retell_tool',
        callId: envelope.call.call_id,
        name: envelope.name,
        result,
      });
      runtime.store.audit(
        'retell:verified_tool',
        `assistant.${envelope.name}`,
        envelope.call.call_id,
        {
          kbVersion: runtime.knowledge.version,
        },
      );
    });
    ledger.persistContext(envelope.call.call_id);
    return jsonResponse({ result, replayed: false });
  });
}

type VerifiedBody = { ok: true; text: string } | { ok: false; error: string; status: 400 | 401 };

async function readVerifiedRetellBody(
  request: Request,
  config: Config,
  verifier: RetellRequestVerifier,
): Promise<VerifiedBody> {
  const signature = request.headers.get('X-Retell-Signature');
  if (signature === null || signature.length === 0) {
    return { ok: false, error: 'missing_retell_signature', status: 401 };
  }
  const rawBody = new Uint8Array(await request.arrayBuffer());
  if (rawBody.byteLength > 32_000) {
    return { ok: false, error: 'retell_body_too_large', status: 400 };
  }
  let valid = false;
  try {
    valid = await verifier(rawBody, signature, config);
  } catch {
    valid = false;
  }
  if (!valid) return { ok: false, error: 'invalid_retell_signature', status: 401 };
  try {
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(rawBody) };
  } catch {
    return { ok: false, error: 'invalid_retell_body', status: 400 };
  }
}
