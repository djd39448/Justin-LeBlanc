/**
 * Authorizes and safely provisions the isolated Google Calendar used by the demo.
 *
 * Dependencies: Node HTTP/crypto/fs, Commander, Zod, and Google OAuth/Calendar HTTPS APIs.
 * Depended on by: attended operator setup and provision-only recovery after provider fixes.
 * Why: credentials stay outside Git, partial consent is rejected, and an uncertain calendar create
 * is never repeated without operator reconciliation.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import { z } from 'zod';

export const REQUESTED_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.freebusy',
] as const;
const REQUIRED_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.app.created',
  'https://www.googleapis.com/auth/calendar.freebusy',
] as const;
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const CALENDAR_CREATE_URL = 'https://www.googleapis.com/calendar/v3/calendars';
const CALENDAR_SUMMARY = 'jlm-demo-performances';

const ClientSchema = z
  .union([
    z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) }),
    z.object({
      installed: z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) }),
    }),
    z.object({ web: z.object({ client_id: z.string().min(1), client_secret: z.string().min(1) }) }),
  ])
  .transform((value) =>
    'installed' in value ? value.installed : 'web' in value ? value.web : value,
  );
const TokenSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
});
const ProfileSchema = z.object({ email: z.email(), email_verified: z.literal(true) });
const CalendarSchema = z.object({ id: z.string().min(1) });
const ProvisioningManifestSchema = z.object({
  version: z.literal(1),
  calendarSummary: z.literal(CALENDAR_SUMMARY),
  attemptId: z.string(),
  status: z.enum(['attempting', 'definitive_failure', 'uncertain', 'created']),
  startedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  httpStatus: z.number().int().nullable(),
  reasons: z.array(z.string()),
  activationUrl: z.url().nullable(),
  calendarId: z.string().nullable(),
});
type ProvisioningManifest = z.infer<typeof ProvisioningManifestSchema>;

export interface GoogleErrorDiagnostic {
  httpStatus: number;
  reasons: string[];
  activationUrl: string | null;
}

interface CliOptions {
  client?: string;
  env: string;
  port: string;
  provisionOnly: boolean;
}

class SafeSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SafeSetupError';
  }
}

/** Returns only actionable non-secret fields from a Google error body. */
export function diagnoseGoogleError(httpStatus: number, body: unknown): GoogleErrorDiagnostic {
  const reasons = new Set<string>();
  let activationUrl: string | null = null;
  const record = isRecord(body) ? body : {};
  const error = record['error'];
  if (typeof error === 'string') reasons.add(error);
  if (isRecord(error)) {
    if (typeof error['status'] === 'string') reasons.add(error['status']);
    const details = Array.isArray(error['details']) ? error['details'] : [];
    for (const detail of details) {
      if (!isRecord(detail)) continue;
      if (typeof detail['reason'] === 'string') reasons.add(detail['reason']);
      const metadata = detail['metadata'];
      if (!isRecord(metadata) || typeof metadata['activationUrl'] !== 'string') continue;
      if (isSafeActivationUrl(metadata['activationUrl'])) activationUrl = metadata['activationUrl'];
    }
  }
  return { httpStatus, reasons: [...reasons].sort(), activationUrl };
}

/** Lists required Calendar scopes absent from the grant returned by Google. */
export function missingCalendarScopes(grantedScopeText: string): string[] {
  const granted = new Set(grantedScopeText.split(/\s+/).filter(Boolean));
  return REQUIRED_CALENDAR_SCOPES.filter((scope) => !granted.has(scope));
}

/** Only a prior definitive 4xx failure or no prior attempt permits another create request. */
export function provisioningRetryAllowed(
  manifest: Pick<ProvisioningManifest, 'status'> | undefined,
): boolean {
  return manifest === undefined || manifest.status === 'definitive_failure';
}

async function main(): Promise<void> {
  const options = new Command()
    .description('Authorize or resume isolated Google Calendar setup without printing credentials')
    .option('--client <path>', 'Installed-app OAuth client JSON outside Git')
    .requiredOption('--env <path>', 'Protected demo runtime env outside Git')
    .option('--port <number>', 'Loopback callback port', '4319')
    .option('--provision-only', 'Use the saved refresh grant and skip interactive OAuth', false)
    .parse()
    .opts<CliOptions>();
  if (options.provisionOnly) {
    await runProvisionOnly(options);
    return;
  }
  if (options.client === undefined) {
    throw new SafeSetupError(
      'Interactive authorization requires --client <protected-client.json>.',
    );
  }
  await runInteractiveAuthorization(options);
}

async function runProvisionOnly(options: CliOptions): Promise<void> {
  const envPath = resolve(options.env);
  const env = readProtectedEnv(envPath);
  const saved = z
    .object({
      clientId: z.string().min(1),
      clientSecret: z.string().min(1),
      refreshToken: z.string().min(1),
    })
    .safeParse({
      clientId: env['GOOGLE_CLIENT_ID'],
      clientSecret: env['GOOGLE_CLIENT_SECRET'],
      refreshToken: env['GOOGLE_REFRESH_TOKEN'],
    });
  if (!saved.success) {
    throw new SafeSetupError(
      'Saved Google client or refresh configuration is incomplete; rerun interactive authorization.',
    );
  }
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: saved.data.clientId,
        client_secret: saved.data.clientSecret,
        refresh_token: saved.data.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
  } catch {
    throw new SafeSetupError(
      'Saved Google refresh request could not reach the provider; no calendar request was attempted.',
    );
  }
  const tokens = await readTokenResponse(response, 'Saved Google refresh grant');
  const grantedScopes = tokens.scope ?? env['GOOGLE_GRANTED_SCOPES'] ?? '';
  await provisionCalendar(envPath, env, tokens.access_token, grantedScopes);
  process.stdout.write(
    `${JSON.stringify({ authorized: true, provisionOnly: true, calendarConfigured: true })}\n`,
  );
}

async function runInteractiveAuthorization(options: CliOptions): Promise<void> {
  const envPath = resolve(options.env);
  const client = readClient(resolve(options.client ?? ''));
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(32).toString('base64url');
  const port = z.coerce.number().int().min(1024).max(65_535).parse(options.port);
  const redirect = `http://127.0.0.1:${port}/oauth/callback`;
  const authUrl = authorizationUrl(client.client_id, redirect, state, verifier);
  const server = createServer((request, response) => {
    void finishAuthorization({
      requestUrl: request.url ?? '',
      response,
      server,
      client,
      envPath,
      redirect,
      state,
      verifier,
    });
  });
  server.on('error', () => {
    process.stderr.write(
      `${JSON.stringify({ authorized: false, error: `OAuth listener could not bind to loopback port ${port}; stop the prior listener or choose --port.` })}\n`,
    );
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    process.stdout.write(
      `${JSON.stringify({ authorizationUrl: authUrl, waitingForUserConsent: true })}\n`,
    );
  });
  setTimeout(() => {
    server.close();
    process.stderr.write('Authorization window expired; restart setup.\n');
    process.exitCode = 1;
  }, 30 * 60_000).unref();
}

async function finishAuthorization(input: {
  requestUrl: string;
  response: ServerResponse;
  server: ReturnType<typeof createServer>;
  client: { client_id: string; client_secret: string };
  envPath: string;
  redirect: string;
  state: string;
  verifier: string;
}): Promise<void> {
  try {
    const url = new URL(input.requestUrl, input.redirect);
    if (url.pathname !== '/oauth/callback') {
      input.response.writeHead(404);
      input.response.end();
      return;
    }
    if (url.searchParams.get('state') !== input.state) {
      throw new SafeSetupError('OAuth callback state was invalid; restart authorization.');
    }
    const code = url.searchParams.get('code');
    if (code === null) {
      throw new SafeSetupError('Authorization was declined; restart setup when ready.');
    }
    const tokens = await exchangeAuthorizationCode(input, code);
    const profile = await readOwnerProfile(tokens.access_token);
    const env = readProtectedEnv(input.envPath);
    if (profile.email.toLowerCase() !== env['SMTP_USER']?.toLowerCase()) {
      throw new SafeSetupError(
        'OAuth identity does not match the configured demo owner; restart with the correct account.',
      );
    }
    if (tokens.refresh_token === undefined) {
      throw new SafeSetupError(
        'Google did not return a refresh credential; revoke the partial grant and restart consent.',
      );
    }
    env['GOOGLE_CLIENT_ID'] = input.client.client_id;
    env['GOOGLE_CLIENT_SECRET'] = input.client.client_secret;
    env['GOOGLE_REFRESH_TOKEN'] = tokens.refresh_token;
    env['GOOGLE_GRANTED_SCOPES'] = tokens.scope ?? '';
    writeProtectedEnv(input.envPath, env);
    await provisionCalendar(input.envPath, env, tokens.access_token, tokens.scope ?? '');
    input.response.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    input.response.end('Justin demo Calendar authorization saved. You can close this tab.');
    process.stdout.write(`${JSON.stringify({ authorized: true, calendarConfigured: true })}\n`);
    input.server.close();
  } catch (error) {
    const message = safeErrorMessage(error);
    input.response.writeHead(500, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    input.response.end(message);
    process.stderr.write(`${JSON.stringify({ authorized: false, error: message })}\n`);
    process.exitCode = 1;
    input.server.close();
  }
}

async function exchangeAuthorizationCode(
  input: {
    client: { client_id: string; client_secret: string };
    redirect: string;
    verifier: string;
  },
  code: string,
): Promise<z.infer<typeof TokenSchema>> {
  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: input.client.client_id,
        client_secret: input.client.client_secret,
        redirect_uri: input.redirect,
        code,
        code_verifier: input.verifier,
        grant_type: 'authorization_code',
      }),
    });
  } catch {
    throw new SafeSetupError(
      'Google OAuth code exchange could not reach the provider; restart authorization.',
    );
  }
  return readTokenResponse(response, 'Google OAuth code exchange');
}

async function readOwnerProfile(accessToken: string): Promise<z.infer<typeof ProfileSchema>> {
  let response: Response;
  try {
    response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new SafeSetupError(
      'Google owner verification could not reach the provider; restart authorization.',
    );
  }
  if (!response.ok) throw await googleResponseError('Google owner verification', response);
  const parsed = ProfileSchema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new SafeSetupError(
      'Google owner verification returned an invalid profile; confirm openid/email consent.',
    );
  }
  return parsed.data;
}

async function readTokenResponse(
  response: Response,
  operation: string,
): Promise<z.infer<typeof TokenSchema>> {
  if (!response.ok) throw await googleResponseError(operation, response);
  const parsed = TokenSchema.safeParse(await readJson(response));
  if (!parsed.success) {
    throw new SafeSetupError(`${operation} returned an invalid token envelope; restart safely.`);
  }
  return parsed.data;
}

async function provisionCalendar(
  envPath: string,
  env: Record<string, string>,
  accessToken: string,
  grantedScopes: string,
): Promise<void> {
  const missing = missingCalendarScopes(grantedScopes);
  if (missing.length > 0) {
    throw new SafeSetupError(
      `Google grant is missing required Calendar scopes: ${missing.join(', ')}. Correct consent, then restart OAuth; no calendar create was attempted.`,
    );
  }
  const owner = z.string().min(1).parse(env['SMTP_USER']);
  if (env['SHOW_CALENDAR_ID']) {
    env['FREE_BUSY_CALENDAR_IDS'] = owner;
    env['GOOGLE_GRANTED_SCOPES'] = grantedScopes;
    writeProtectedEnv(envPath, env);
    return;
  }

  const manifestPath = provisioningManifestPath(envPath);
  const previous = readProvisioningManifest(manifestPath);
  if (previous?.status === 'created' && previous.calendarId !== null) {
    env['SHOW_CALENDAR_ID'] = previous.calendarId;
    env['FREE_BUSY_CALENDAR_IDS'] = owner;
    env['GOOGLE_GRANTED_SCOPES'] = grantedScopes;
    writeProtectedEnv(envPath, env);
    return;
  }
  if (!provisioningRetryAllowed(previous)) {
    throw new SafeSetupError(
      `Calendar creation is ${previous?.status ?? 'uncertain'} from a prior attempt. Inspect the isolated Google account and private provisioning manifest before any retry.`,
    );
  }

  const attempt = newManifest('attempting');
  writeProvisioningManifest(manifestPath, attempt);
  let response: Response;
  try {
    response = await fetch(CALENDAR_CREATE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: CALENDAR_SUMMARY,
        description: 'Isolated Justin LeBlanc synthetic demo bookings only.',
        timeZone: 'America/Chicago',
      }),
    });
  } catch {
    writeProvisioningManifest(manifestPath, updateManifest(attempt, 'uncertain'));
    throw new SafeSetupError(
      'Calendar creation transport failed with an uncertain outcome. Inspect the isolated account before retrying.',
    );
  }

  if (!response.ok) {
    const body = await readJson(response);
    const diagnostic = diagnoseGoogleError(response.status, body);
    const status =
      response.status >= 400 && response.status < 500 ? 'definitive_failure' : 'uncertain';
    writeProvisioningManifest(manifestPath, updateManifest(attempt, status, diagnostic));
    throw diagnosticError('Dedicated calendar creation', diagnostic);
  }
  const calendar = CalendarSchema.safeParse(await readJson(response));
  if (!calendar.success) {
    writeProvisioningManifest(manifestPath, updateManifest(attempt, 'uncertain'));
    throw new SafeSetupError(
      'Calendar creation returned success without a usable ID. Inspect the isolated account before retrying.',
    );
  }
  writeProvisioningManifest(
    manifestPath,
    updateManifest(attempt, 'created', undefined, calendar.data.id),
  );
  env['SHOW_CALENDAR_ID'] = calendar.data.id;
  env['FREE_BUSY_CALENDAR_IDS'] = owner;
  env['GOOGLE_GRANTED_SCOPES'] = grantedScopes;
  writeProtectedEnv(envPath, env);
}

function authorizationUrl(
  clientId: string,
  redirect: string,
  state: string,
  verifier: string,
): string {
  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: REQUESTED_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
    code_challenge: createHash('sha256').update(verifier).digest('base64url'),
    code_challenge_method: 'S256',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

async function googleResponseError(operation: string, response: Response): Promise<SafeSetupError> {
  return diagnosticError(operation, diagnoseGoogleError(response.status, await readJson(response)));
}

function diagnosticError(operation: string, diagnostic: GoogleErrorDiagnostic): SafeSetupError {
  const reasons = diagnostic.reasons.length > 0 ? diagnostic.reasons.join(', ') : 'unreported';
  const activation =
    diagnostic.activationUrl === null ? '' : ` Activation URL: ${diagnostic.activationUrl}.`;
  const remedy = diagnostic.reasons.includes('SERVICE_DISABLED')
    ? ' Enable the Google Calendar API, wait for activation, then run --provision-only.'
    : ' Correct the provider configuration and retry only if this was a definitive 4xx response.';
  return new SafeSetupError(
    `${operation} failed (HTTP ${diagnostic.httpStatus}; reasons: ${reasons}).${activation}${remedy}`,
  );
}

function readClient(path: string): z.infer<typeof ClientSchema> {
  try {
    return ClientSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new SafeSetupError('OAuth client JSON is missing or invalid; use the protected file.');
  }
}

function readProtectedEnv(path: string): Record<string, string> {
  try {
    const parsed = parseEnv(readFileSync(path, 'utf8'));
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value !== undefined) result[key] = value;
    }
    return result;
  } catch {
    throw new SafeSetupError('Protected runtime env is missing or invalid; verify --env.');
  }
}

function writeProtectedEnv(path: string, env: Record<string, string>): void {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(
    temporary,
    `${Object.entries(env)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('\n')}\n`,
    { mode: 0o600 },
  );
  try {
    renameSync(temporary, path);
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary);
    throw error;
  }
}

function provisioningManifestPath(envPath: string): string {
  return resolve(dirname(envPath), 'google-calendar-provisioning.json');
}

function readProvisioningManifest(path: string): ProvisioningManifest | undefined {
  if (!existsSync(path)) return undefined;
  try {
    return ProvisioningManifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    throw new SafeSetupError(
      'Private provisioning manifest is invalid; inspect it before any calendar retry.',
    );
  }
}

function writeProvisioningManifest(path: string, manifest: ProvisioningManifest): void {
  writeFileSync(path, `${JSON.stringify(ProvisioningManifestSchema.parse(manifest), null, 2)}\n`, {
    mode: 0o600,
  });
}

function newManifest(status: ProvisioningManifest['status']): ProvisioningManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    calendarSummary: CALENDAR_SUMMARY,
    attemptId: randomUUID(),
    status,
    startedAt: now,
    updatedAt: now,
    httpStatus: null,
    reasons: [],
    activationUrl: null,
    calendarId: null,
  };
}

function updateManifest(
  manifest: ProvisioningManifest,
  status: ProvisioningManifest['status'],
  diagnostic?: GoogleErrorDiagnostic,
  calendarId: string | null = null,
): ProvisioningManifest {
  return {
    ...manifest,
    status,
    updatedAt: new Date().toISOString(),
    httpStatus: diagnostic?.httpStatus ?? null,
    reasons: diagnostic?.reasons ?? [],
    activationUrl: diagnostic?.activationUrl ?? null,
    calendarId,
  };
}

async function readJson(response: Response): Promise<unknown> {
  const text = (await response.text()).slice(0, 100_000);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

function isSafeActivationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      ['console.developers.google.com', 'console.cloud.google.com'].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeErrorMessage(error: unknown): string {
  return error instanceof SafeSetupError
    ? error.message
    : 'Google Calendar setup failed unexpectedly; inspect the private manifest and retry safely.';
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(resolve(entrypoint)).href) {
  void main().catch((error: unknown) => {
    process.stderr.write(`${JSON.stringify({ ok: false, error: safeErrorMessage(error) })}\n`);
    process.exitCode = 1;
  });
}
