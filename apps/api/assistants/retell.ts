/**
 * Builds the isolated Retell agent contract and verifies signed raw-body webhooks.
 *
 * Dependencies: Retell server SDK, Config, canonical KB release, and public tool schemas.
 * Depended on by: voice provisioning scripts and the Retell webhook/tool HTTP routes.
 * Why this exists: voice has separate provider identity while sharing facts and safe operations.
 */
import Retell from 'retell-sdk';
import { z } from 'zod';

import { renderAssistantContext, type KnowledgeRelease } from '../../../kb/release.js';
import type { Config } from '../config.js';
import { Store } from '../store.js';

import { publicAssistantTools, type AssistantToolContext } from './tools.js';

export const RetellWebhookSchema = z.object({
  event: z.enum(['call_started', 'call_ended', 'call_analyzed']),
  call: z
    .object({
      call_id: z.string(),
      agent_id: z.string(),
    })
    .passthrough(),
});
export type RetellWebhook = z.infer<typeof RetellWebhookSchema>;
const RetellConversationSchema = z.object({
  channel: z.literal('voice'),
  providerCallId: z.string(),
  agentId: z.string(),
  kbVersion: z.string(),
  kbHash: z.string(),
  inquiryId: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
  lastSeenAt: z.iso.datetime({ offset: true }),
});

export interface RetellAgentConfig {
  agentId: string;
  phoneNumber: string;
  kbVersion: string;
  kbHash: string;
  prompt: string;
  tools: ReturnType<typeof publicAssistantTools>;
  webhookUrl: string;
}

/** Produces a dedicated voice config with the exact canonical KB release and public tools. */
export function buildRetellAgentConfig(
  config: Config,
  knowledge: KnowledgeRelease,
): RetellAgentConfig {
  if (config.RETELL_JLM_AGENT_ID.length === 0 || config.RETELL_JLM_PHONE_NUMBER.length === 0) {
    throw new Error('Retell Justin agent and managed number are not configured.');
  }
  return {
    agentId: config.RETELL_JLM_AGENT_ID,
    phoneNumber: config.RETELL_JLM_PHONE_NUMBER,
    kbVersion: knowledge.version,
    kbHash: knowledge.hash,
    prompt: [
      'You are a dedicated AI voice booking assistant for the Justin LeBlanc demo.',
      'Use a distinct synthetic voice; never imply that you are Justin.',
      'Read back email, date, time, timezone, and price and invite corrections before writes.',
      'A tentative hold is not a confirmed performance. Unknown facts require human follow-up.',
      renderAssistantContext(knowledge),
    ].join('\n\n'),
    tools: publicAssistantTools(),
    webhookUrl: `${config.API_URL}/webhooks/retell`,
  };
}

/** Verifies the exact raw request bytes before parsing and enforces the dedicated agent ID. */
export async function verifyRetellWebhook(
  rawBody: Uint8Array,
  signature: string,
  config: Config,
): Promise<RetellWebhook> {
  if (config.RETELL_API_KEY.length === 0) {
    throw new Error(
      'RETELL_API_KEY is empty; configure webhook verification before enabling voice.',
    );
  }
  const rawText = Buffer.from(rawBody).toString('utf8');
  if (!(await Retell.verify(rawText, config.RETELL_API_KEY, signature))) {
    throw new Error('Retell webhook signature is invalid; reject the request with HTTP 401.');
  }
  const event = RetellWebhookSchema.parse(JSON.parse(rawText));
  if (event.call.agent_id !== config.RETELL_JLM_AGENT_ID) {
    throw new Error('Retell webhook belongs to another agent; reject it without processing.');
  }
  return event;
}

/**
 * Maps only verified Retell call IDs to live server-owned tool context.
 * Resume tokens stay in memory; after restart a call must establish association again.
 */
export class RetellCallSessionLedger {
  private readonly liveContexts = new Map<string, AssistantToolContext>();

  constructor(private readonly store: Store) {}

  /** Creates or refreshes the ledger after raw signature and dedicated-agent checks pass. */
  beginVerifiedCall(event: RetellWebhook, knowledge: KnowledgeRelease): AssistantToolContext {
    const callId = event.call.call_id;
    const id = `retell:${callId}`;
    const now = new Date().toISOString();
    const prior = this.store.find('conversations', id, RetellConversationSchema);
    if (prior === undefined) {
      this.store.insert('conversations', id, {
        channel: 'voice',
        providerCallId: callId,
        agentId: event.call.agent_id,
        kbVersion: knowledge.version,
        kbHash: knowledge.hash,
        inquiryId: null,
        createdAt: now,
        lastSeenAt: now,
      });
    } else {
      if (prior.data.agentId !== event.call.agent_id) {
        throw new Error('Retell call ID was previously associated with another agent.');
      }
      this.store.update('conversations', prior.id, prior.revision, {
        ...prior.data,
        lastSeenAt: now,
      });
    }
    const existing = this.liveContexts.get(callId);
    if (existing !== undefined) return existing;
    const context: AssistantToolContext = {
      inquiryId: prior === undefined ? null : prior.data.inquiryId,
      resumeToken: null,
      channel: 'voice',
    };
    this.liveContexts.set(callId, context);
    return context;
  }

  /** Returns context only for a call admitted by beginVerifiedCall in this process. */
  contextForVerifiedCall(callId: string): AssistantToolContext {
    const context = this.liveContexts.get(callId);
    if (context === undefined) {
      throw new Error('Retell call has no verified live session; verify its raw webhook first.');
    }
    return context;
  }

  /** Persists only the non-secret inquiry association after a successful tool call. */
  persistContext(callId: string): void {
    const context = this.contextForVerifiedCall(callId);
    const id = `retell:${callId}`;
    this.store.transaction(() => {
      const record = this.store.get('conversations', id, RetellConversationSchema);
      this.store.update('conversations', id, record.revision, {
        ...record.data,
        inquiryId: context.inquiryId,
        lastSeenAt: new Date().toISOString(),
      });
      this.store.audit('retell:verified_call', 'conversation.association_updated', id, {
        associated: context.inquiryId !== null,
      });
    });
  }

  /** Removes plaintext live credentials after a verified call end event. */
  endVerifiedCall(callId: string): void {
    if (!this.liveContexts.delete(callId)) {
      throw new Error('Retell call has no verified live session to end.');
    }
  }
}
