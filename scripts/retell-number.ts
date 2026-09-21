/** Provisions one isolated Houston Retell demo number and safely retires its prior demo number.
 * Dependencies: Retell SDK, private env/manifest, Commander. Consumers: authorized demo provisioning.
 * Why: durable reconciliation and disabled retries prevent duplicate purchases or unrelated deletion. */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import Retell from 'retell-sdk';
import { z } from 'zod';

const TARGET_NICKNAME = 'jlm-demo-houston-bookings';
const PRIOR_NICKNAME = 'jlm-demo-private-bookings';
const HOUSTON_AREA_CODES = [713, 281, 832, 346] as const;

const opts = new Command()
  .requiredOption('--env <path>')
  .requiredOption('--manifest <path>')
  .option('--area-code <code>', 'Houston area code', '832')
  .option('--execute', 'Purchase the requested US number at the documented $2/month plus usage')
  .option('--replace-prior', 'Release the one validated prior Justin demo number after replacement')
  .parse()
  .opts<{
    env: string;
    manifest: string;
    areaCode: string;
    execute?: boolean;
    replacePrior?: boolean;
  }>();

const targetAreaCode = z.coerce
  .number()
  .int()
  .refine((value) => HOUSTON_AREA_CODES.some((allowed) => allowed === value))
  .parse(opts.areaCode);

const env = parseEnv(readFileSync(opts.env, 'utf8'));
if (!env.RETELL_API_KEY || !env.RETELL_JLM_AGENT_ID || !env.API_URL) {
  throw new Error('Provision the separate agent before the number.');
}
const client = new Retell({ apiKey: env.RETELL_API_KEY, maxRetries: 0, timeout: 20_000 });
type PhoneNumber = Awaited<ReturnType<typeof client.phoneNumber.retrieve>>;

async function listNumbers(): Promise<PhoneNumber[]> {
  let page = await client.phoneNumber.list();
  const numbers = [...page.items];
  while (page.has_more) {
    if (!page.pagination_key) {
      throw new Error('Retell number pagination incomplete; refusing provider mutation.');
    }
    page = await client.phoneNumber.list({ pagination_key: page.pagination_key });
    numbers.push(...page.items);
  }
  return numbers;
}

function oneByNickname(numbers: PhoneNumber[], nickname: string): PhoneNumber | null {
  const matches = numbers.filter((number) => number.nickname === nickname);
  if (matches.length > 1) {
    throw new Error(`Multiple resources match the isolated nickname ${nickname}.`);
  }
  return matches[0] ?? null;
}

function assertTarget(number: PhoneNumber): void {
  const expectedWebhook = new URL('/api/retell/inbound', env.API_URL).toString();
  if (
    number.nickname !== TARGET_NICKNAME ||
    number.phone_number_type !== 'retell-twilio' ||
    !number.phone_number.startsWith(`+1${targetAreaCode}`) ||
    (number.area_code !== undefined && number.area_code !== targetAreaCode) ||
    number.inbound_webhook_url !== expectedWebhook ||
    (number.inbound_agents?.length ?? 0) !== 0 ||
    (number.outbound_agents?.length ?? 0) !== 0
  ) {
    throw new Error('Houston number verification failed; stop before replacing any resource.');
  }
}

function saveManifest(value: unknown): void {
  writeFileSync(opts.manifest, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

const ManifestNumberSchema = z
  .object({
    phone_number: z.string(),
    phone_number_type: z.string(),
    nickname: z.string().nullable().optional(),
  })
  .passthrough();
const priorManifest = existsSync(opts.manifest)
  ? z
      .object({
        stage: z.string(),
        nickname: z.string().optional(),
        number: ManifestNumberSchema.optional(),
        priorNumber: ManifestNumberSchema.nullable().optional(),
      })
      .passthrough()
      .parse(JSON.parse(readFileSync(opts.manifest, 'utf8')))
  : null;

const calls = await client.call.list({
  limit: 10,
  sort_order: 'descending',
  filter_criteria: { agent: [{ agent_id: env.RETELL_JLM_AGENT_ID }] },
});
if (
  calls.items.some((call) => call.call_status === 'registered' || call.call_status === 'ongoing')
) {
  throw new Error('An isolated-agent call is active; refusing number replacement.');
}

let numbers = await listNumbers();
let target = oneByNickname(numbers, TARGET_NICKNAME);
const prior = oneByNickname(numbers, PRIOR_NICKNAME);
if (!target && !opts.execute) {
  process.stdout.write(
    `${JSON.stringify({
      dryRun: true,
      nickname: TARGET_NICKNAME,
      areaCode: targetAreaCode,
      priorFound: prior !== null,
      isolatedAgentCallsChecked: calls.items.length,
      monthlyUsd: 2,
      defaultInboundAgent: null,
      outboundAgent: null,
    })}\n`,
  );
  process.exit(0);
}

if (!target) {
  if (priorManifest?.stage === 'replacement_started') {
    throw new Error(
      'A replacement attempt is unresolved; reconcile provider state before retrying.',
    );
  }
  saveManifest({
    stage: 'replacement_started',
    at: new Date().toISOString(),
    targetNickname: TARGET_NICKNAME,
    targetAreaCode,
    priorNumber: prior,
  });
  try {
    target = await client.phoneNumber.create({
      nickname: TARGET_NICKNAME,
      number_provider: 'twilio',
      country_code: 'US',
      area_code: targetAreaCode,
      toll_free: false,
      allowed_inbound_country_list: ['US'],
      allowed_outbound_country_list: ['US'],
      inbound_agents: [],
      outbound_agents: [],
      inbound_webhook_url: new URL('/api/retell/inbound', env.API_URL).toString(),
    });
  } catch (error) {
    const status = error instanceof Retell.APIError ? error.status : null;
    saveManifest({
      stage: 'replacement_provider_rejected',
      at: new Date().toISOString(),
      targetNickname: TARGET_NICKNAME,
      targetAreaCode,
      status,
      priorNumber: prior,
    });
    process.stderr.write(
      `${JSON.stringify({ ok: false, status, remedy: 'Reconcile provider state before retrying.' })}\n`,
    );
    process.exit(1);
  }
}

assertTarget(target);
const retrievedTarget = await client.phoneNumber.retrieve(target.phone_number);
assertTarget(retrievedTarget);
env.RETELL_JLM_PHONE_NUMBER = retrievedTarget.phone_number;
env.VOICE_ENABLED = 'false';
writeFileSync(
  opts.env,
  `${Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join('\n')}\n`,
  { mode: 0o600 },
);
saveManifest({
  stage: 'houston_verified',
  at: new Date().toISOString(),
  number: retrievedTarget,
  priorNumber: prior,
  isolatedAgentCallsChecked: calls.items.length,
});

let priorReleased = prior === null;
if (opts.replacePrior && prior !== null) {
  const manifestNumber =
    priorManifest?.number?.nickname === PRIOR_NICKNAME
      ? priorManifest.number
      : priorManifest?.priorNumber;
  if (
    prior.phone_number === retrievedTarget.phone_number ||
    prior.nickname !== PRIOR_NICKNAME ||
    prior.phone_number_type !== 'retell-twilio' ||
    manifestNumber?.phone_number !== prior.phone_number ||
    manifestNumber.nickname !== PRIOR_NICKNAME ||
    manifestNumber.phone_number_type !== 'retell-twilio'
  ) {
    throw new Error(
      'Prior number does not exactly match its private Justin manifest; refusing release.',
    );
  }
  try {
    await client.phoneNumber.delete(prior.phone_number);
  } catch {
    // Some successful empty-body provider responses fail SDK parsing; absence below is authoritative.
  }
  numbers = await listNumbers();
  priorReleased = !numbers.some((number) => number.phone_number === prior.phone_number);
  if (!priorReleased) {
    throw new Error('Prior number remains at the provider; no delete retry was attempted.');
  }
}

saveManifest({
  stage: 'replacement_complete',
  at: new Date().toISOString(),
  number: retrievedTarget,
  priorReleased,
  isolatedAgentCallsChecked: calls.items.length,
  providerNumberCount: numbers.length,
});
process.stdout.write(
  `${JSON.stringify({
    ok: true,
    areaCode: targetAreaCode,
    last4: retrievedTarget.phone_number.slice(-4),
    provider: retrievedTarget.phone_number_type,
    priorReleased,
    defaultAgentBound: false,
    inboundWebhookConfigured: true,
    voiceEnabled: false,
    isolatedAgentCallsChecked: calls.items.length,
  })}\n`,
);
