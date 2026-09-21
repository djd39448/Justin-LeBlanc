/** Obtains a separate least-privilege Google Calendar grant for the demo.
 * Dependencies: Node HTTP/crypto/fs, Commander and Zod. Consumers: operator setup only.
 * Why: service accounts cannot safely substitute for invitation-capable user authorization.
 * Usage: npx tsx scripts/google-authorize.ts --client /secure/client.json --env /secure/runtime.env
 * The operator approves Google's consent page; tokens are never printed or stored in the repo. */
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import { z } from 'zod';

const args = new Command()
  .requiredOption('--client <path>', 'Existing installed-app OAuth client JSON outside Git')
  .requiredOption('--env <path>', 'Protected demo runtime env outside Git')
  .option('--port <number>', 'Loopback callback port', '4319')
  .parse()
  .opts<{ client: string; env: string; port: string }>();
const client = z
  .object({ client_id: z.string(), client_secret: z.string() })
  .parse(JSON.parse(readFileSync(args.client, 'utf8')));
const state = randomBytes(32).toString('base64url');
const verifier = randomBytes(32).toString('base64url');
const redirect = `http://127.0.0.1:${Number(args.port)}/oauth/callback`;
const scopes = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.freebusy',
];
const query = new URLSearchParams({
  client_id: client.client_id,
  redirect_uri: redirect,
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline',
  prompt: 'consent',
  state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
  login_hint: parseEnv(readFileSync(args.env, 'utf8')).SMTP_USER || '',
});
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
const server = createServer((req, res) => {
  void finish(req.url || '', res).catch(() => {
    res.writeHead(500);
    res.end('Calendar authorization failed. Check the consent scopes and restart setup.');
    process.stderr.write(
      'Google authorization failed; reconnect the correct demo account. No credentials were logged.\n',
    );
  });
});

/** Exchanges a state-checked callback for a dedicated token and creates only the named calendar. */
async function finish(requestUrl: string, res: import('node:http').ServerResponse): Promise<void> {
  const url = new URL(requestUrl, redirect);
  if (url.pathname !== '/oauth/callback') {
    res.writeHead(404);
    res.end();
    return;
  }
  if (url.searchParams.get('state') !== state) {
    res.writeHead(403);
    res.end('Invalid authorization state.');
    return;
  }
  const code = url.searchParams.get('code');
  if (!code) {
    res.writeHead(400);
    res.end('Authorization declined. Restart setup when ready.');
    return;
  }
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: client.client_id,
      client_secret: client.client_secret,
      redirect_uri: redirect,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) throw new Error('OAuth exchange failed.');
  const tokens = z
    .object({ access_token: z.string(), refresh_token: z.string() })
    .parse(await response.json());
  const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = z
    .object({ email: z.email(), email_verified: z.literal(true) })
    .parse(await profileResponse.json());
  const env = parseEnv(readFileSync(args.env, 'utf8'));
  if (profile.email.toLowerCase() !== env.SMTP_USER?.toLowerCase())
    throw new Error('OAuth identity does not match configured owner.');
  env.GOOGLE_CLIENT_ID = client.client_id;
  env.GOOGLE_CLIENT_SECRET = client.client_secret;
  env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
  // Save the completed grant before provisioning, so a transient calendar failure does not lose it.
  writeFileSync(
    args.env,
    Object.entries(env)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('\n'),
    { mode: 0o600 },
  );
  if (!env.SHOW_CALENDAR_ID) {
    const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: 'jlm-demo-performances',
        description: 'Isolated Justin LeBlanc synthetic demo bookings only.',
        timeZone: 'America/Chicago',
      }),
    });
    if (!calendarResponse.ok) throw new Error('Dedicated calendar creation failed.');
    env.SHOW_CALENDAR_ID = z.object({ id: z.string() }).parse(await calendarResponse.json()).id;
  }
  env.FREE_BUSY_CALENDAR_IDS = profile.email;
  writeFileSync(
    args.env,
    Object.entries(env)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join('\n'),
    { mode: 0o600 },
  );
  res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
  res.end('Justin demo Calendar authorization saved. You can close this tab.');
  process.stdout.write(
    JSON.stringify({ authorized: true, calendarId: env.SHOW_CALENDAR_ID, scopes }) + '\n',
  );
  server.close();
}
server.listen(Number(args.port), '127.0.0.1', () =>
  process.stdout.write(
    JSON.stringify({ authorizationUrl: authUrl, waitingForUserConsent: true }) + '\n',
  ),
);
setTimeout(() => {
  server.close();
  process.stderr.write('Authorization window expired; restart setup.\n');
  process.exit(1);
}, 30 * 60_000).unref();
