/** Verifies Retell transcript envelopes receive a larger authenticated body budget only. */
import { sign } from 'retell-sdk';
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../apps/api/app.js';
import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';
import { RETELL_MAX_BODY_BYTES } from '../apps/api/voice-routes.js';

const RETELL_KEY = 'retell-test-secret';
const AGENT_ID = 'agent_jlm_demo';
const PUBLIC_MAX_BODY_BYTES = 32 * 1024;

let runtime: Runtime | undefined;

afterEach(() => {
  runtime?.store.close();
  runtime = undefined;
});

function fixture() {
  runtime = createRuntime(
    ConfigSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: ':memory:',
      ADMIN_TOKEN: 'a'.repeat(32),
      JOB_AUTH_SECRET: 'j'.repeat(32),
      DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test,client@example.test',
      OPERATOR_EMAIL: 'operator@example.test',
      PERFORMER_EMAIL: 'operator@example.test',
      CLIENT_TEST_EMAIL: 'client@example.test',
      RETELL_API_KEY: RETELL_KEY,
      RETELL_JLM_AGENT_ID: AGENT_ID,
      RETELL_JLM_PHONE_NUMBER: '+18325550123',
      DEMO_CALLER_ALLOWLIST: '+18325550124',
      VOICE_ENABLED: 'true',
    }),
  );
  return { app: createApp(runtime), runtime };
}

async function signedPost(app: ReturnType<typeof createApp>, path: string, body: string) {
  return app.request(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Retell-Signature': await sign(body, RETELL_KEY),
    },
    body,
  });
}

describe('Retell payload limits at the composed HTTP boundary', () => {
  it('accepts signed transcript-bearing tools and terminal events without persisting transcripts', async () => {
    const { app, runtime: activeRuntime } = fixture();
    const callId = 'call_large_transcript';
    const started = JSON.stringify({
      event: 'call_started',
      call: { call_id: callId, agent_id: AGENT_ID },
    });
    expect((await signedPost(app, '/api/webhooks/retell', started)).status).toBe(200);

    const transcriptMarker = `private-transcript-${'x'.repeat(40_000)}`;
    const call = {
      call_id: callId,
      agent_id: AGENT_ID,
      transcript: [{ role: 'agent', content: transcriptMarker }],
    };
    const tool = JSON.stringify({
      name: 'search_knowledge',
      call,
      args: { question: 'Are these published prices?', topic: 'pricing' },
    });
    expect(Buffer.byteLength(tool)).toBeGreaterThan(PUBLIC_MAX_BODY_BYTES);
    expect((await signedPost(app, '/api/retell/tools', tool)).status).toBe(200);

    const oversizedArgument = JSON.stringify({
      name: 'search_knowledge',
      call,
      args: { question: 'q'.repeat(801), topic: null },
    });
    expect((await signedPost(app, '/api/retell/tools', oversizedArgument)).status).toBe(400);

    for (const event of ['call_ended', 'call_analyzed'] as const) {
      const body = JSON.stringify({ event, call });
      expect(Buffer.byteLength(body)).toBeGreaterThan(PUBLIC_MAX_BODY_BYTES);
      expect((await signedPost(app, '/api/webhooks/retell', body)).status).toBe(200);
    }

    const record = activeRuntime.store.db
      .prepare('SELECT data FROM conversations WHERE id=?')
      .get(`retell:${callId}`);
    expect(String(record?.data)).not.toContain('private-transcript');
  });

  it('still verifies large Retell bodies before parsing them', async () => {
    const { app } = fixture();
    const body = JSON.stringify({ padding: 'x'.repeat(40_000) });
    expect(Buffer.byteLength(body)).toBeGreaterThan(PUBLIC_MAX_BODY_BYTES);
    expect(Buffer.byteLength(body)).toBeLessThan(RETELL_MAX_BODY_BYTES);

    const missing = await app.request('/api/retell/tools', { method: 'POST', body });
    expect(missing.status).toBe(401);
    const invalid = await app.request('/api/retell/tools', {
      method: 'POST',
      headers: { 'X-Retell-Signature': 'invalid' },
      body,
    });
    expect(invalid.status).toBe(401);
  });

  it('rejects Retell bodies over one MiB with and without Content-Length', async () => {
    const { app } = fixture();
    const body = 'x'.repeat(RETELL_MAX_BODY_BYTES + 1);
    const signature = await sign(body, RETELL_KEY);
    const headers = { 'X-Retell-Signature': signature };

    const declared = await app.request('/api/retell/tools', {
      method: 'POST',
      headers: { ...headers, 'Content-Length': String(Buffer.byteLength(body)) },
      body,
    });
    expect(declared.status).toBe(413);

    const streamed = new Request('http://localhost/api/retell/tools', {
      method: 'POST',
      headers,
      body,
    });
    expect(streamed.headers.has('Content-Length')).toBe(false);
    expect((await app.request(streamed)).status).toBe(413);
  });

  it('keeps ordinary public and Retell inbound requests at 32 KiB', async () => {
    const { app } = fixture();
    const ordinary = JSON.stringify({ padding: 'x'.repeat(PUBLIC_MAX_BODY_BYTES) });
    expect(
      (
        await app.request('/api/inquiries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ordinary,
        })
      ).status,
    ).toBe(413);

    const inbound = JSON.stringify({
      event: 'call_inbound',
      call_inbound: {
        call_id: 'call_inbound_large',
        from_number: '+18325550124',
        to_number: '+18325550123',
      },
      padding: 'x'.repeat(PUBLIC_MAX_BODY_BYTES),
    });
    expect((await signedPost(app, '/api/retell/inbound', inbound)).status).toBe(413);
  });
});
