/** Verifies real HTTP authorization, resume isolation, private rendering and demo seeding.
 * Dependencies: Hono app, SQLite runtime and Vitest. Consumers: CI.
 * Why: domain tests alone cannot catch exposed operator routes or wire-level schema drift. */
import { afterEach, describe, expect, it } from 'vitest';

import { createApp } from '../apps/api/app.js';
import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';

const active: Runtime[] = [];
function fixture() {
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
