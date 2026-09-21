/** Verifies shared KB parity, public tool boundaries, and raw-body Retell authentication. */
import { sign } from 'retell-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { OpenAIChatAssistant } from '../apps/api/assistants/openai.js';
import {
  RetellCallSessionLedger,
  type RetellWebhook,
  verifyRetellWebhook,
} from '../apps/api/assistants/retell.js';
import { publicAssistantTools, routeAssistantTool } from '../apps/api/assistants/tools.js';
import { ConfigSchema } from '../apps/api/config.js';
import { Store } from '../apps/api/store.js';
import { loadKnowledgeRelease, searchKnowledge } from '../kb/release.js';

const config = ConfigSchema.parse({
  NODE_ENV: 'test',
  ADMIN_TOKEN: 'a'.repeat(32),
  JOB_AUTH_SECRET: 'j'.repeat(32),
  DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test,client@example.test',
  OPERATOR_EMAIL: 'operator@example.test',
  PERFORMER_EMAIL: 'operator@example.test',
  CLIENT_TEST_EMAIL: 'client@example.test',
  RETELL_API_KEY: 'retell-test-secret',
  RETELL_JLM_AGENT_ID: 'agent_jlm_demo',
  RETELL_JLM_PHONE_NUMBER: '+15555550100',
});

describe('canonical knowledge release', () => {
  it('is deterministic and returns source provenance', () => {
    const first = loadKnowledgeRelease();
    const second = loadKnowledgeRelease();
    expect(first.hash).toBe(second.hash);
    const answer = searchKnowledge(first, 'Are these published prices?', 'pricing');
    expect(answer.supported).toBe(true);
    expect(answer.facts[0]?.sourceUrl).toBe('repo:docs/DECISIONS.md');
  });

  it('returns explicit follow-up for unsupported questions', () => {
    const answer = searchKnowledge(
      loadKnowledgeRelease(),
      'Do you know every requested song?',
      'repertoire',
    );
    expect(answer.supported).toBe(false);
    expect(answer.nextAction).toContain('human follow-up');
  });
});

describe('assistant tool boundary', () => {
  it('contains no operator confirmation, pricing mutation, or invoice tool', () => {
    const names = publicAssistantTools().map((tool) => tool.name);
    expect(names).not.toContain('confirm_show');
    expect(names).not.toContain('amend_quote');
    expect(names).not.toContain('invoice_issue');
  });

  it('rejects an unlisted tool before any handler executes', async () => {
    const handler = async () => ({ ok: true });
    await expect(
      routeAssistantTool(
        { name: 'confirm_show', arguments: '{}' },
        { inquiryId: null, resumeToken: null, channel: 'chat' },
        {
          searchKnowledge: handler,
          upsertInquiry: handler,
          estimateEvent: handler,
          getAvailability: handler,
          scheduleConsultationAndHold: handler,
          requestHumanFollowup: handler,
        },
      ),
    ).rejects.toThrow();
  });

  it('deterministically captures unsupported knowledge for an associated inquiry', async () => {
    let capturedQuestion = '';
    const handler = async () => ({ ok: true });
    const result = await routeAssistantTool(
      {
        name: 'search_knowledge',
        arguments: JSON.stringify({ question: 'Can Justin guarantee this song?', topic: null }),
      },
      { inquiryId: 'inquiry-demo', resumeToken: 'server-token', channel: 'chat' },
      {
        searchKnowledge: async () => ({ supported: false, facts: [] }),
        upsertInquiry: handler,
        estimateEvent: handler,
        getAvailability: handler,
        scheduleConsultationAndHold: handler,
        requestHumanFollowup: async (args) => {
          capturedQuestion = z.object({ question: z.string() }).parse(args).question;
          return { status: 'captured' };
        },
      },
    );
    expect(capturedQuestion).toBe('Can Justin guarantee this song?');
    expect(result).toMatchObject({ followup: { status: 'captured' } });
  });
});

describe('OpenAIChatAssistant readiness and budget', () => {
  const handler = async () => ({ ok: true });
  const handlers = {
    searchKnowledge: handler,
    upsertInquiry: handler,
    estimateEvent: handler,
    getAvailability: handler,
    scheduleConsultationAndHold: handler,
    requestHumanFollowup: handler,
  };

  it('boots without a key and reports the readiness gap only when chat is invoked', async () => {
    const aiConfig = ConfigSchema.parse({ ...baseConfigForAi(), AI_ENABLED: 'true' });
    const assistant = new OpenAIChatAssistant(aiConfig, loadKnowledgeRelease(), handlers);
    await expect(
      assistant.respond({
        message: 'Hello',
        context: { inquiryId: null, resumeToken: null, channel: 'chat' },
      }),
    ).rejects.toThrow('OPENAI_API_KEY is empty');
  });

  it('rejects oversized server history before making a provider request', async () => {
    const aiConfig = ConfigSchema.parse({
      ...baseConfigForAi(),
      AI_ENABLED: 'true',
      OPENAI_API_KEY: 'server-test-key',
    });
    const neverRequest: typeof fetch = async () => {
      throw new Error('Provider request should not be reached.');
    };
    const assistant = new OpenAIChatAssistant(
      aiConfig,
      loadKnowledgeRelease(),
      handlers,
      neverRequest,
    );
    await expect(
      assistant.respond({
        message: 'Hello',
        priorItems: Array.from({ length: 81 }, () => ({ role: 'user', content: 'bounded' })),
        context: { inquiryId: null, resumeToken: null, channel: 'chat' },
      }),
    ).rejects.toThrow('80 items');
  });

  it('sends a bounded provider request and reports provider token usage', async () => {
    const aiConfig = ConfigSchema.parse({
      ...baseConfigForAi(),
      AI_ENABLED: 'true',
      OPENAI_API_KEY: 'server-test-key',
    });
    let capturedSignal: AbortSignal | null | undefined;
    const request: typeof fetch = async (_input, init) => {
      capturedSignal = init?.signal;
      return new Response(
        JSON.stringify({
          id: 'response_test',
          output: [
            {
              type: 'message',
              content: [{ type: 'output_text', text: 'Bounded reply.' }],
            },
          ],
          usage: { input_tokens: 10, output_tokens: 3, total_tokens: 13 },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };
    const result = await new OpenAIChatAssistant(
      aiConfig,
      loadKnowledgeRelease(),
      handlers,
      request,
    ).respond({
      message: 'Hello',
      context: { inquiryId: null, resumeToken: null, channel: 'chat' },
    });
    expect(capturedSignal).toBeInstanceOf(AbortSignal);
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 3, totalTokens: 13 });
  });
});

describe('Retell webhook verification', () => {
  it('accepts the exact signed raw body and rejects altered bytes', async () => {
    const raw = JSON.stringify({
      event: 'call_started',
      call: { call_id: 'call_demo', agent_id: 'agent_jlm_demo' },
    });
    const signature = await sign(raw, config.RETELL_API_KEY);
    const verified = await verifyRetellWebhook(Buffer.from(raw), signature, config);
    expect(verified.call.call_id).toBe('call_demo');
    await expect(verifyRetellWebhook(Buffer.from(`${raw} `), signature, config)).rejects.toThrow(
      'signature is invalid',
    );
  });

  it('admits context only after a verified call is recorded and never persists its token', () => {
    const store = new Store(':memory:');
    const ledger = new RetellCallSessionLedger(store);
    const event: RetellWebhook = {
      event: 'call_started',
      call: { call_id: 'call_ledger', agent_id: 'agent_jlm_demo' },
    };
    expect(() => ledger.contextForVerifiedCall('call_ledger')).toThrow('no verified live session');
    const context = ledger.beginVerifiedCall(event, loadKnowledgeRelease());
    context.inquiryId = 'inquiry-demo';
    context.resumeToken = 'secret-live-token';
    ledger.persistContext('call_ledger');
    ledger.endVerifiedCall('call_ledger');
    const restored = new RetellCallSessionLedger(store).beginVerifiedCall(
      event,
      loadKnowledgeRelease(),
    );
    expect(restored.inquiryId).toBe('inquiry-demo');
    expect(restored.resumeToken).toBeNull();
    store.close();
  });

  it('caps live call concurrency and expires call credentials after five minutes', () => {
    const store = new Store(':memory:');
    let now = 1_000;
    const ledger = new RetellCallSessionLedger(store, 2, 300_000, () => now);
    const event = (callId: string): RetellWebhook => ({
      event: 'call_started',
      call: { call_id: callId, agent_id: 'agent_jlm_demo' },
    });
    ledger.beginVerifiedCall(event('call_one'), loadKnowledgeRelease());
    ledger.beginVerifiedCall(event('call_two'), loadKnowledgeRelease());
    expect(() => ledger.beginVerifiedCall(event('call_three'), loadKnowledgeRelease())).toThrow(
      'live-call limit',
    );
    now += 300_001;
    expect(() => ledger.contextForVerifiedCall('call_one')).toThrow('no verified live session');
    expect(ledger.beginVerifiedCall(event('call_three'), loadKnowledgeRelease()).channel).toBe(
      'voice',
    );
    store.close();
  });
});

function baseConfigForAi(): Record<string, string> {
  return {
    NODE_ENV: 'test',
    ADMIN_TOKEN: 'a'.repeat(32),
    JOB_AUTH_SECRET: 'j'.repeat(32),
    DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test,client@example.test',
    OPERATOR_EMAIL: 'operator@example.test',
    PERFORMER_EMAIL: 'operator@example.test',
    CLIENT_TEST_EMAIL: 'client@example.test',
  };
}
