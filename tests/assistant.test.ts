/** Verifies shared KB parity, public tool boundaries, and raw-body Retell authentication. */
import { sign } from 'retell-sdk';
import { describe, expect, it } from 'vitest';

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
});
