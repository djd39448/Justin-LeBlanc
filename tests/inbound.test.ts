/** Verifies pre-connection voice controls independently of a paid phone call.
 * Dependencies: Hono, runtime, Config and injected signed-envelope verifier. Consumers: CI.
 * Why: missing callers, wrong numbers, disabled voice and exhausted quotas must never connect. */
import { Hono } from 'hono';
import { afterEach, expect, it } from 'vitest';

import { ConfigSchema } from '../apps/api/config.js';
import { mountInboundRoutes } from '../apps/api/inbound-routes.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';

let runtime: Runtime;
afterEach(() => runtime?.store.close());
function fixture(enabled = true) {
  runtime = createRuntime(
    ConfigSchema.parse({
      ADMIN_TOKEN: 'a'.repeat(40),
      JOB_AUTH_SECRET: 'j'.repeat(40),
      DEMO_RECIPIENT_ALLOWLIST: 'operator@example.com',
      OPERATOR_EMAIL: 'operator@example.com',
      PERFORMER_EMAIL: 'operator@example.com',
      CLIENT_TEST_EMAIL: 'operator@example.com',
      OPENAI_API_KEY: 'test-only',
      DATABASE_URL: ':memory:',
      RETELL_JLM_AGENT_ID: 'agent-demo',
      RETELL_JLM_PHONE_NUMBER: '+12025550101',
      DEMO_CALLER_ALLOWLIST: '+12025550102',
      VOICE_ENABLED: String(enabled),
      VOICE_DAILY_CALL_LIMIT: 1,
    }),
  );
  const app = new Hono();
  mountInboundRoutes(app, runtime, async (bytes, signature) => {
    if (signature !== 'valid') throw new Error('invalid');
    return Buffer.from(bytes).toString('utf8');
  });
  return app;
}
async function send(
  app: Hono,
  id = 'call-1',
  from = '+12025550102',
  to = '+12025550101',
  signature = 'valid',
) {
  return (
    await app.request('/api/retell/inbound', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Retell-Signature': signature },
      body: JSON.stringify({
        event: 'call_inbound',
        call_inbound: { call_id: id, from_number: from, to_number: to },
      }),
    })
  ).json() as Promise<{ call_inbound: { reject?: boolean; override_agent_id?: string } }>;
}
it('fails closed when voice is disabled', async () =>
  expect((await send(fixture(false))).call_inbound.reject).toBe(true));
it('refuses forged signatures and non-allowlisted caller/destination', async () => {
  const app = fixture();
  expect((await send(app, 'a', '+12025550103')).call_inbound.reject).toBe(true);
  expect((await send(app, 'b', '+12025550102', '+12025550109')).call_inbound.reject).toBe(true);
  expect((await send(app, 'c', '+12025550102', '+12025550101', 'forged')).call_inbound.reject).toBe(
    true,
  );
});
it('replays one decision without charging a second quota slot and caps new calls', async () => {
  const app = fixture();
  expect((await send(app)).call_inbound.override_agent_id).toBe('agent-demo');
  expect((await send(app)).call_inbound.override_agent_id).toBe('agent-demo');
  expect((await send(app, 'call-2')).call_inbound.reject).toBe(true);
});
