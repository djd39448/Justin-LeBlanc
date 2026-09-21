/** HTTP authorization, origin and durable rate boundaries.
 * Dependencies: Hono, crypto, Store and Config. Consumers: API bootstrap.
 * Why: public assistants cannot inherit operator authority or bypass last-boundary recipient checks. */
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import type { Context, MiddlewareHandler } from 'hono';

import type { Config } from './config.js';
import type { Store } from './store.js';

/** Constant-time bearer match; returns false for absent or malformed credentials. */
export function authorized(header: string | undefined, secret: string): boolean {
  if (!header?.startsWith('Bearer ')) return false;
  const candidate = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
/** Requires the dedicated operator or scheduler token; no cookie CSRF surface is introduced. */
export function requireToken(secret: string): MiddlewareHandler {
  return async (c, next) => {
    if (!authorized(c.req.header('authorization'), secret))
      return c.json({ error: 'unauthorized', message: 'Operator authentication required.' }, 401);
    await next();
    return;
  };
}
/** Applies source boundaries and noncacheable/noindex headers to every API response. */
export function boundary(config: Config): MiddlewareHandler {
  return async (c, next) => {
    const origin = c.req.header('origin');
    if (
      origin &&
      origin !== config.PUBLIC_SITE_URL &&
      !(config.NODE_ENV === 'development' && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
    )
      return c.json({ error: 'origin_blocked' }, 403);
    c.header('Cache-Control', 'no-store');
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Request-ID', randomUUID());
    if (origin) {
      c.header('Access-Control-Allow-Origin', origin);
      c.header('Vary', 'Origin');
    }
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    if (c.req.method === 'OPTIONS') return c.body(null, 204);
    await next();
    return;
  };
}
/** Bounds public requests per hashed edge address and time bucket, across process restarts. */
export function rateLimit(store: Store, limit = 30): MiddlewareHandler {
  store.db.exec(
    'CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL)',
  );
  return async (c, next) => {
    // Tunnel overwrites CF-Connecting-IP. Direct local traffic is deliberately one shared bucket.
    const ip = c.req.header('cf-connecting-ip') || 'local';
    const bucket = Math.floor(Date.now() / 60000);
    const key = createHash('sha256').update(`${ip}:${bucket}`).digest('hex');
    const row = store.db
      .prepare(
        'INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',
      )
      .get(key, bucket + 2);
    if (!row || typeof row.count !== 'number')
      throw new Error('Rate-limit database returned invalid count; inspect database integrity.');
    if (row.count > limit)
      return c.json({ error: 'rate_limit', message: 'Please wait a minute and try again.' }, 429);
    store.db.prepare('DELETE FROM rate_limits WHERE expires<?').run(bucket);
    await next();
    return;
  };
}
/** Returns the opaque resume credential from a public Authorization header. */
export function resumeToken(c: Context): string {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer '))
    throw new Error('Resume token required; use the saved inquiry link.');
  return header.slice(7);
}
