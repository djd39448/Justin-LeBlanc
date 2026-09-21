/** Verifies Retell admission, raw-body auth, replay behavior, and new-resource plans. */
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime } from '../apps/api/runtime.js';
import { mountVoiceRoutes } from '../apps/api/voice-routes.js';
import {
  buildRetellProvisionPlan,
  type ProvisionManifest,
  protectedProvisionDisposition,
} from '../scripts/retell-provision.js';

const config = ConfigSchema.parse({
  NODE_ENV: 'test',
  DATABASE_URL: ':memory:',
  ADMIN_TOKEN: 'a'.repeat(32),
  JOB_AUTH_SECRET: 'j'.repeat(32),
  DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test,client@example.test',
  OPERATOR_EMAIL: 'operator@example.test',
  PERFORMER_EMAIL: 'operator@example.test',
  CLIENT_TEST_EMAIL: 'client@example.test',
  RETELL_API_KEY: 'retell-test-secret',
  RETELL_JLM_AGENT_ID: 'agent_jlm_demo',
  RETELL_JLM_PHONE_NUMBER: '',
  VOICE_ENABLED: 'true',
});

describe('signed Retell HTTP routes', () => {
  it('rejects invalid signatures before parsing and preserves exact signed bytes', async () => {
    const runtime = createRuntime(config);
    const app = new Hono();
    const seenBodies: string[] = [];
    mountVoiceRoutes(app, runtime, {
      verifySignature: async (rawBody, signature) => {
        seenBodies.push(Buffer.from(rawBody).toString('utf8'));
        return signature === 'valid';
      },
    });
    const exactBody = ` {"event":"call_started","call":{"call_id":"call_demo","agent_id":"agent_jlm_demo"}}\n`;
    const invalid = await app.request('/api/webhooks/retell', {
      method: 'POST',
      headers: { 'X-Retell-Signature': 'invalid' },
      body: exactBody,
    });
    expect(invalid.status).toBe(401);
    const accepted = await app.request('/api/webhooks/retell', {
      method: 'POST',
      headers: { 'X-Retell-Signature': 'valid' },
      body: exactBody,
    });
    expect(accepted.status).toBe(200);
    expect(seenBodies).toEqual([exactBody, exactBody]);
    runtime.store.close();
  });

  it('requires call admission and replays an identical public tool envelope', async () => {
    const runtime = createRuntime(config);
    const app = new Hono();
    mountVoiceRoutes(app, runtime, { verifySignature: async () => true });
    const toolBody = JSON.stringify({
      name: 'search_knowledge',
      call: { call_id: 'call_tools', agent_id: 'agent_jlm_demo' },
      args: { question: 'Are these published prices?', topic: 'pricing' },
    });
    const beforeAdmission = await app.request('/api/retell/tools', signedPost(toolBody));
    expect(beforeAdmission.status).toBe(409);

    const callStarted = JSON.stringify({
      event: 'call_started',
      call: { call_id: 'call_tools', agent_id: 'agent_jlm_demo' },
    });
    expect((await app.request('/api/webhooks/retell', signedPost(callStarted))).status).toBe(200);
    const first = await app.request('/api/retell/tools', signedPost(toolBody));
    const replay = await app.request('/api/retell/tools', signedPost(toolBody));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ replayed: false });
    expect(await replay.json()).toMatchObject({ replayed: true });
    runtime.store.close();
  });

  it('serializes concurrent tools for one call before the processed-event insert', async () => {
    const runtime = createRuntime(config);
    const app = new Hono();
    let toolCalls = 0;
    let releaseTool: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    const toolStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    const toolGate = new Promise<void>((resolve) => {
      releaseTool = resolve;
    });
    runtime.handlers.searchKnowledge = async () => {
      toolCalls += 1;
      markStarted?.();
      await toolGate;
      return { supported: true };
    };
    mountVoiceRoutes(app, runtime, { verifySignature: async () => true });
    const callStarted = JSON.stringify({
      event: 'call_started',
      call: { call_id: 'call_race', agent_id: 'agent_jlm_demo' },
    });
    expect((await app.request('/api/webhooks/retell', signedPost(callStarted))).status).toBe(200);
    const toolBody = JSON.stringify({
      name: 'search_knowledge',
      call: { call_id: 'call_race', agent_id: 'agent_jlm_demo' },
      args: { question: 'What is approved?', topic: null },
    });
    const firstPromise = app.request('/api/retell/tools', signedPost(toolBody));
    await toolStarted;
    const concurrent = await app.request('/api/retell/tools', signedPost(toolBody));
    expect(concurrent.status).toBe(409);
    expect(await concurrent.json()).toEqual({ error: 'retell_tool_in_progress' });
    releaseTool?.();
    expect((await firstPromise).status).toBe(200);
    const replay = await app.request('/api/retell/tools', signedPost(toolBody));
    expect(await replay.json()).toMatchObject({ replayed: true });
    expect(toolCalls).toBe(1);
    runtime.store.close();
  });
});

describe('Retell provisioning plan', () => {
  it('requires an in-place refresh when a protected agent crosses a KB release', () => {
    const protectedManifest: ProvisionManifest = {
      version: 1,
      stage: 'agent_reconciled',
      agentName: 'jlm-demo-booking-assistant-2026-09-21.1',
      agentId: 'agent_existing',
      llmId: 'llm_existing',
      voiceId: 'voice_existing',
      kbVersion: '2026-09-21.1',
      kbHash: 'old-hash',
      apiUrl: 'https://demo.example.test',
      phoneNumberId: null,
      recordedAt: '2026-09-21T12:00:00.000Z',
    };
    expect(
      protectedProvisionDisposition(protectedManifest, {
        version: '2026-09-21.2',
        hash: 'new-hash',
      }),
    ).toBe('refresh_protected');
    expect(
      protectedProvisionDisposition(
        { ...protectedManifest, agentId: null, stage: 'llm_created' },
        { version: '2026-09-21.2', hash: 'new-hash' },
      ),
    ).toBe('unprotected');
  });

  it('contains only public custom tools and performs no phone-number action', () => {
    const plan = buildRetellProvisionPlan('https://demo.example.test', 'voice_approved');
    expect(plan.llm.general_tools.map((tool) => tool.name)).not.toContain('confirm_show');
    expect(plan.llm.general_tools.every((tool) => tool.type === 'custom')).toBe(true);
    expect(plan.llm.general_tools.every((tool) => tool.max_retry === 0)).toBe(true);
    expect(plan.agent.webhook_url).toBe('https://demo.example.test/api/webhooks/retell');
    expect(plan.agent.max_call_duration_ms).toBe(300_000);
  });

  it('rejects loopback and non-TLS callback URLs', () => {
    expect(() => buildRetellProvisionPlan('http://127.0.0.1:4318', 'voice_approved')).toThrow(
      'public HTTPS',
    );
  });
});

function signedPost(body: string): RequestInit {
  return { method: 'POST', headers: { 'X-Retell-Signature': 'valid' }, body };
}
