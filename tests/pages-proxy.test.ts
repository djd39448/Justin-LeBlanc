/** Proves the Pages proxy exposes only the fixed, sanitized schedule 503. */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { onRequest } from '../functions/api/[[path]].js';

const unavailable = {
  error: 'public_events_unavailable',
  message: 'Current dates are temporarily unavailable.',
};

function request(path: string, init?: RequestInit): Promise<Response> {
  return onRequest({
    request: new Request(`https://justinleblancmusic.50by50.dev${path}`, init),
    env: { API_ORIGIN: 'https://jlm-demo-api.50by50.dev' },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe('Pages API proxy', () => {
  it('uses neutral public copy when the API origin is not configured', async () => {
    const response = await onRequest({
      request: new Request('https://justinleblancmusic.50by50.dev/api/health'),
      env: {},
    });

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({
      error: 'api_not_configured',
      message: 'The booking service is being connected. Please try again shortly.',
    });
    expect(JSON.stringify(body)).not.toMatch(/\bdemo\b/i);
  });

  it('passes through only the exact sanitized public-events unavailable response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(unavailable, { status: 503 })),
    );

    const response = await request('/api/public-events');

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(unavailable);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Retry-After')).toBe('300');
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex');
  });

  it.each([
    [500, '/api/public-events', unavailable],
    [502, '/api/public-events', { error: 'provider_diagnostic', calendarId: 'private' }],
    [503, '/api/public-events', { error: 'provider_diagnostic', calendarId: 'private' }],
    [504, '/api/public-events', { error: 'provider_diagnostic', calendarId: 'private' }],
    [503, '/api/bookings', unavailable],
  ])('masks unsafe upstream %s response for %s', async (status, path, body) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(body, { status })),
    );

    const response = await request(path as string);

    expect(response.status).toBe(503);
    const responseBody = await response.json();
    expect(responseBody).toEqual({
      error: 'api_unavailable',
      message:
        'The booking service is temporarily unavailable. Your browser draft remains saved; please try again shortly.',
    });
    expect(JSON.stringify(responseBody)).not.toMatch(/\bdemo\b/i);
  });

  it('masks the fixed public-events response for non-GET requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(unavailable, { status: 503 })),
    );

    const response = await request('/api/public-events', { method: 'POST' });

    expect(response.status).toBe(503);
    expect((await response.json()) as { error: string }).toEqual(
      expect.objectContaining({ error: 'api_unavailable' }),
    );
  });

  it('preserves successful API responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ok: true })),
    );

    const response = await request('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
