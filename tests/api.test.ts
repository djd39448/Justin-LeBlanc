/** Verifies real HTTP authorization, resume isolation, private rendering and demo seeding.
 * Dependencies: Hono app, SQLite runtime and Vitest. Consumers: CI.
 * Why: domain tests alone cannot catch exposed operator routes or wire-level schema drift. */
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../apps/api/app.js';
import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';

const active: Runtime[] = [];
function fixture(overrides: Record<string, string> = {}) {
  const runtime = createRuntime(
    ConfigSchema.parse({
      ADMIN_TOKEN: 'a'.repeat(40),
      JOB_AUTH_SECRET: 'j'.repeat(40),
      DEMO_RECIPIENT_ALLOWLIST: 'client@example.com,operator@example.com',
      OPERATOR_EMAIL: 'operator@example.com',
      PERFORMER_EMAIL: 'operator@example.com',
      CLIENT_TEST_EMAIL: 'client@example.com',
      OPENAI_API_KEY: 'test-only',
      DATABASE_URL: ':memory:',
      PRIVATE_STORAGE_PATH: 'private/test-documents',
      ...overrides,
    }),
  );
  active.push(runtime);
  return { runtime, app: createApp(runtime) };
}
afterEach(() => {
  for (const r of active.splice(0)) r.store.close();
});
const intake = {
  name: 'Synthetic Host',
  email: 'client@example.com',
  eventType: 'private',
  date: 'flexible',
  city: 'Houston',
  durationMinutes: 120,
  atmosphere: 'Relaxed acoustic music',
  consent: true,
  source: 'form',
};
describe('HTTP boundaries', () => {
  it('rejects private actions and cross-origin requests; health contains no credentials', async () => {
    const { app } = fixture();
    expect((await app.request('/api/admin/state')).status).toBe(401);
    expect(
      (
        await app.request('/api/admin/action', {
          method: 'POST',
          body: '{}',
          headers: { 'Content-Type': 'application/json' },
        })
      ).status,
    ).toBe(401);
    expect(
      (await app.request('/api/health', { headers: { Origin: 'https://attacker.example' } }))
        .status,
    ).toBe(403);
    const health = await app.request('/api/health');
    expect(health.headers.get('Cache-Control')).toBe('no-store');
    expect(await health.text()).not.toContain('test-only');
  });
  it('publishes only the gated E.164 demo voice number', async () => {
    const caller = '+12025550199';
    const readHealth = async (overrides: Record<string, string>) => {
      const { app } = fixture({ DEMO_CALLER_ALLOWLIST: caller, ...overrides });
      const response = await app.request('/api/health');
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).not.toContain(caller);
      return JSON.parse(text) as Record<string, unknown>;
    };

    expect(
      await readHealth({ VOICE_ENABLED: 'false', RETELL_JLM_PHONE_NUMBER: '+12025550100' }),
    ).not.toHaveProperty('demoVoicePhoneNumber');
    expect(
      await readHealth({ VOICE_ENABLED: 'true', RETELL_JLM_PHONE_NUMBER: '202-555-0100' }),
    ).not.toHaveProperty('demoVoicePhoneNumber');
    expect(
      await readHealth({ VOICE_ENABLED: 'true', RETELL_JLM_PHONE_NUMBER: '+12025550100' }),
    ).toHaveProperty('demoVoicePhoneNumber', '+12025550100');
  });
  it('persists form intake and requires its own resume credential', async () => {
    const { app } = fixture();
    const response = await app.request('/api/inquiries', {
      method: 'POST',
      body: JSON.stringify(intake),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status).toBe(201);
    const receipt = (await response.json()) as { id: string; token: string };
    const own = await app.request(`/api/inquiries/${receipt.id}`, {
      headers: { Authorization: `Bearer ${receipt.token}` },
    });
    expect(own.status).toBe(200);
    const other = await app.request(`/api/inquiries/${receipt.id}`, {
      headers: { Authorization: `Bearer ${'x'.repeat(43)}` },
    });
    expect(other.status).toBe(400);
    expect(await other.text()).not.toContain('client@example.com');
  });
  it('keeps follow-ups behind job authentication and the invoice email gate', async () => {
    const { app, runtime } = fixture();
    const request = (token: string) =>
      app.request('/api/jobs/run', {
        method: 'POST',
        body: JSON.stringify({ action: 'billing-followups' }),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    expect((await request('a'.repeat(40))).status).toBe(401);
    const disabled = await request('j'.repeat(40));
    expect(disabled.status).toBe(400);
    expect(await disabled.text()).toContain('Invoice email is disabled');
    expect(runtime.store.effects()).toHaveLength(0);
  });
  it('converts valid zones and rejects DST gaps', async () => {
    const { app } = fixture();
    for (const [local, status] of [
      ['2026-03-08T02:30', 400],
      ['2026-03-08T03:30', 200],
    ] as const) {
      const r = await app.request('/api/time', {
        method: 'POST',
        body: JSON.stringify({ local, timezone: 'America/Chicago' }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(r.status).toBe(status);
    }
  });
  it('keeps repeat simulation and brief preview free of duplicate external effects', async () => {
    const { app, runtime } = fixture();
    const headers = {
      Authorization: `Bearer ${'a'.repeat(40)}`,
      'Content-Type': 'application/json',
    };
    runtime.store.acquireLease('demo:seed:jlm-demo-http-test', 'another-worker', 30_000);
    const contended = await app.request('/api/admin/action', {
      method: 'POST',
      body: JSON.stringify({ action: 'demo-seed', key: 'http-test' }),
      headers,
    });
    expect(contended.status).toBe(400);
    expect(runtime.store.db.prepare('SELECT COUNT(*) AS count FROM inquiries').get()?.count).toBe(
      0,
    );
    expect(runtime.store.effects()).toHaveLength(0);
    runtime.store.releaseLease('demo:seed:jlm-demo-http-test', 'another-worker');
    for (let i = 0; i < 2; i++) {
      const r = await app.request('/api/admin/action', {
        method: 'POST',
        body: JSON.stringify({ action: 'demo-seed', key: 'http-test' }),
        headers,
      });
      expect(r.status).toBe(200);
    }
    expect(runtime.store.effects()).toHaveLength(1);
    const preview = await app.request('/api/admin/shows/jlm-demo-http-test/brief/html', {
      headers,
    });
    expect(preview.status).toBe(200);
    expect(await preview.text()).toContain('Jordan Demo');
    expect(runtime.store.effects()).toHaveLength(1);
  });
});
