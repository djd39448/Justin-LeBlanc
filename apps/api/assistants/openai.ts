/**
 * Runs bounded chat turns through the OpenAI Responses API with strict public function tools.
 *
 * Dependencies: server Config, canonical KB release, and the public assistant tool router.
 * Depended on by: the chat HTTP endpoint.
 * Why this exists: model output can suggest actions but all effects pass deterministic services.
 */
import { z } from 'zod';

import { renderAssistantContext, type KnowledgeRelease } from '../../../kb/release.js';
import type { Config } from '../config.js';

import {
  publicAssistantTools,
  routeAssistantTool,
  type AssistantToolContext,
  type AssistantToolHandlers,
} from './tools.js';

const RESPONSES_URL = 'https://api.openai.com/v1/responses';
const MAX_TOOL_ROUNDS = 6;
const REQUEST_TIMEOUT_MS = 20_000;
const TURN_TIMEOUT_MS = 85_000;
const MAX_INPUT_ITEMS = 80;
const MAX_INPUT_CHARACTERS = 48_000;
const ResponseSchema = z.object({
  id: z.string(),
  output: z.array(z.record(z.string(), z.unknown())),
  output_text: z.string().optional(),
  usage: z
    .object({
      input_tokens: z.number().int().nonnegative(),
      output_tokens: z.number().int().nonnegative(),
      total_tokens: z.number().int().nonnegative(),
    })
    .optional(),
});

export interface ChatTurnInput {
  message: string;
  context: AssistantToolContext;
  priorItems?: unknown[];
}
export interface ChatTurnResult {
  responseId: string;
  text: string;
  outputItems: unknown[];
  kbVersion: string;
  kbHash: string;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
}

/** Stateless Responses API client. The API key remains server-side and responses are not stored. */
export class OpenAIChatAssistant {
  constructor(
    private readonly config: Config,
    private readonly knowledge: KnowledgeRelease,
    private readonly handlers: AssistantToolHandlers,
    private readonly request: typeof fetch = fetch,
  ) {}

  /** Runs one visitor turn and any bounded public-tool loop. */
  async respond(input: ChatTurnInput): Promise<ChatTurnResult> {
    if (!this.config.AI_ENABLED)
      throw new Error('AI_ENABLED=false; enable chat only after qualification.');
    if (this.config.OPENAI_API_KEY.length === 0) {
      throw new Error('OPENAI_API_KEY is empty; configure the approved server-side key.');
    }
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    const items: unknown[] = [
      ...(input.priorItems ?? []),
      { role: 'user', content: z.string().min(1).max(4_000).parse(input.message) },
    ];
    let lastResponseId = '';
    const usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await this.createResponse(items, input.context, deadline);
      lastResponseId = response.id;
      if (response.usage !== undefined) {
        usage.inputTokens += response.usage.input_tokens;
        usage.outputTokens += response.usage.output_tokens;
        usage.totalTokens += response.usage.total_tokens;
      }
      items.push(...response.output);
      const calls = response.output.filter((item) => item['type'] === 'function_call');
      if (calls.length === 0) {
        const text = response.output_text ?? this.extractOutputText(response.output);
        if (text.length === 0) throw new Error('OpenAI response contained no assistant text.');
        return {
          responseId: response.id,
          text,
          outputItems: items,
          kbVersion: this.knowledge.version,
          kbHash: this.knowledge.hash,
          usage: usage.totalTokens === 0 ? null : usage,
        };
      }
      for (const call of calls) {
        const callId = z.string().parse(call['call_id']);
        const result = await routeAssistantTool(
          { name: call['name'], arguments: call['arguments'] },
          input.context,
          this.handlers,
        );
        items.push({
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(result),
        });
      }
    }
    throw new Error(
      `OpenAI response ${lastResponseId} exceeded ${MAX_TOOL_ROUNDS} tool rounds; simplify the request.`,
    );
  }

  private async createResponse(items: unknown[], context: AssistantToolContext, deadline: number) {
    if (items.length > MAX_INPUT_ITEMS) {
      throw new Error(`Chat history exceeds ${MAX_INPUT_ITEMS} items; start a new conversation.`);
    }
    const serializedItems = JSON.stringify(items);
    if (serializedItems.length > MAX_INPUT_CHARACTERS) {
      throw new Error(
        `Chat history exceeds the ${MAX_INPUT_CHARACTERS}-character input budget; start a new conversation.`,
      );
    }
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error('Chat turn exceeded its 85-second execution budget.');
    let response: Response;
    try {
      response = await this.request(RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remainingMs)),
        body: JSON.stringify({
          model: this.config.OPENAI_CHAT_MODEL,
          store: false,
          max_output_tokens: 700,
          parallel_tool_calls: false,
          instructions: this.instructions(context),
          input: items,
          tools: publicAssistantTools(),
        }),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'network_error';
      throw new Error(
        `OpenAI Responses request stopped before completion (${reason}); retry the chat turn.`,
      );
    }
    if (!response.ok) {
      throw new Error(
        `OpenAI Responses request failed with HTTP ${response.status}; check model access, quota, and server logs.`,
      );
    }
    return ResponseSchema.parse(await response.json());
  }

  private instructions(context: AssistantToolContext): string {
    return [
      'You are the Justin LeBlanc demo booking assistant. Identify yourself as AI.',
      'Be warm and concise. Use tools for facts, estimates, availability, and booking writes.',
      'Never claim a tentative hold is confirmed. Never invent repertoire, rates, availability, scarcity, testimonials, or response times.',
      'Unknown facts must be captured with request_human_followup.',
      'Read back email, date, time, timezone, and price before a write, allowing correction.',
      `Channel: ${context.channel}. Current inquiry association: ${context.inquiryId === null ? 'none' : 'verified session'}.`,
      renderAssistantContext(this.knowledge),
    ].join('\n\n');
  }

  private extractOutputText(output: z.infer<typeof ResponseSchema>['output']): string {
    const parts: string[] = [];
    for (const item of output) {
      if (item['type'] !== 'message' || !Array.isArray(item['content'])) continue;
      for (const content of item['content']) {
        const parsed = z
          .object({ type: z.string(), text: z.string().optional() })
          .safeParse(content);
        if (
          parsed.success &&
          parsed.data.type === 'output_text' &&
          parsed.data.text !== undefined
        ) {
          parts.push(parsed.data.text);
        }
      }
    }
    return parts.join('\n');
  }
}
