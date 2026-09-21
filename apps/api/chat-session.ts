/** Persists bounded server-owned chat history and opaque session authorization.
 * Dependencies: crypto, Zod, runtime. Consumers: public chat route.
 * Why: callers cannot inject tool outputs or developer roles via client-supplied history. */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import type { AssistantToolContext } from './assistants/tools.js';
import type { Runtime } from './runtime.js';

export const ChatInputSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().optional(),
  conversationToken: z.string().min(32).optional(),
  inquiryId: z.string().optional(),
  token: z.string().min(32).optional(),
});
const SessionSchema = z.object({
  kind: z.literal('chat'),
  tokenHash: z.string(),
  turns: z.number(),
  items: z.array(z.unknown()),
  inquiryId: z.string().nullable(),
  resumeToken: z.string().nullable(),
  kbHash: z.string(),
});
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

/** Runs one bounded chat turn; returns scoped session credentials and assistant prose only. */
export async function chatTurn(runtime: Runtime, raw: unknown) {
  if (!runtime.config.AI_ENABLED)
    throw new Error('Chat is currently disabled; use the inquiry form.');
  const input = ChatInputSchema.parse(raw);
  const id = input.conversationId || randomUUID();
  const token = input.conversationToken || randomBytes(32).toString('base64url');
  const stored = runtime.store.find('conversations', id, SessionSchema);
  if (input.conversationId && !stored)
    throw new Error('Chat session not found; start a new conversation.');
  if (stored && !timingSafeEqual(Buffer.from(stored.data.tokenHash), Buffer.from(hash(token))))
    throw new Error('Chat session authorization failed; use the original browser session.');
  if (stored && stored.data.turns >= 20)
    throw new Error('This demo conversation reached its 20-turn limit; request human follow-up.');
  if (input.inquiryId) {
    runtime.booking.inspectInquiry(input.inquiryId, input.token || '');
  }
  const context: AssistantToolContext = {
    channel: 'chat',
    inquiryId: input.inquiryId || stored?.data.inquiryId || null,
    resumeToken: input.token || stored?.data.resumeToken || null,
  };
  if (stored && stored.data.kbHash !== runtime.knowledge.hash)
    throw new Error(
      'Knowledge release changed; start a new chat so answers use the current release.',
    );
  const leaseOwner = randomUUID();
  if (!runtime.store.acquireLease(`chat:${id}`, leaseOwner, 120000))
    throw new Error('A chat reply is still running; wait before sending another message.');
  try {
    const dailyCount = runtime.store.nextSequence(
      `chat-turns:${new Date().toISOString().slice(0, 10)}`,
    );
    if (dailyCount > runtime.config.CHAT_DAILY_TURN_LIMIT)
      throw new Error('The demo chat reached its daily limit; use the inquiry form.');
    const result = await runtime.chat.respond({
      message: input.message,
      context,
      priorItems: stored?.data.items || [],
    });
    const data = SessionSchema.parse({
      kind: 'chat',
      tokenHash: hash(token),
      turns: (stored?.data.turns || 0) + 1,
      items: result.outputItems,
      inquiryId: context.inquiryId,
      resumeToken: context.resumeToken,
      kbHash: result.kbHash,
    });
    if (stored) runtime.store.update('conversations', id, stored.revision, data);
    else runtime.store.insert('conversations', id, data);
    return {
      reply: result.text,
      kbVersion: result.kbVersion,
      kbHash: result.kbHash,
      conversationId: id,
      conversationToken: token,
      inquiryId: context.inquiryId,
      token: context.resumeToken,
    };
  } finally {
    runtime.store.releaseLease(`chat:${id}`, leaseOwner);
  }
}
