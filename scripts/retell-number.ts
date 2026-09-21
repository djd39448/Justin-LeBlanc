/** Purchases only one new Twilio-backed Retell demo number, with no default call agent.
 * Dependencies: Retell SDK, private env/manifest, Commander. Consumers: authorized demo provisioning.
 * Why: exact nickname reconciliation and disabled provider retries prevent accidental purchases. */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import Retell from 'retell-sdk';
import { z } from 'zod';

const opts = new Command()
  .requiredOption('--env <path>')
  .requiredOption('--manifest <path>')
  .option('--execute', 'Purchase the requested US number at the documented $2/month plus usage')
  .parse()
  .opts<{ env: string; manifest: string; execute?: boolean }>();
const env = parseEnv(readFileSync(opts.env, 'utf8'));
if (!env.RETELL_API_KEY || !env.RETELL_JLM_AGENT_ID || !env.API_URL)
  throw new Error('Provision the separate agent before the number.');
const name = 'jlm-demo-private-bookings';
const client = new Retell({ apiKey: env.RETELL_API_KEY, maxRetries: 0, timeout: 20000 });
let page = await client.phoneNumber.list();
const numbers = [...page.items];
while (page.has_more) {
  if (!page.pagination_key)
    throw new Error('Retell number pagination incomplete; refusing purchase.');
  page = await client.phoneNumber.list({ pagination_key: page.pagination_key });
  numbers.push(...page.items);
}
const found = numbers.filter((n) => n.nickname === name);
if (found.length > 1)
  throw new Error('Multiple demo numbers match; inspect provider state before proceeding.');
let number = found[0];
const prior = existsSync(opts.manifest)
  ? z.object({ stage: z.string() }).parse(JSON.parse(readFileSync(opts.manifest, 'utf8')))
  : null;
if (!number && prior && prior.stage !== 'provider_rejected')
  throw new Error(
    'A previous number purchase was started but not reconciled; inspect Retell before any retry.',
  );
if (!number && !opts.execute) {
  process.stdout.write(
    JSON.stringify({
      dryRun: true,
      nickname: name,
      number_provider: 'twilio',
      country_code: 'US',
      defaultInboundAgent: null,
      outboundAgent: null,
      monthlyUsd: 2,
    }) + '\n',
  );
  process.exit(0);
}
if (!number) {
  writeFileSync(
    opts.manifest,
    JSON.stringify({ stage: 'purchase_started', at: new Date().toISOString(), nickname: name }),
    { flag: prior ? 'w' : 'wx', mode: 0o600 },
  );
  try {
    number = await client.phoneNumber.create({
      nickname: name,
      number_provider: 'twilio',
      country_code: 'US',
      toll_free: false,
      allowed_inbound_country_list: ['US'],
      allowed_outbound_country_list: ['US'],
      inbound_agents: [],
      outbound_agents: [],
      inbound_webhook_url: new URL('/api/retell/inbound', env.API_URL).toString(),
    });
  } catch (error) {
    const status = error instanceof Retell.APIError ? error.status : undefined;
    if (status !== undefined && [400, 401, 402, 403, 422].includes(status))
      writeFileSync(
        opts.manifest,
        JSON.stringify({
          stage: 'provider_rejected',
          status,
          at: new Date().toISOString(),
          nickname: name,
          remedy:
            status === 403
              ? 'Complete Retell account KYC in the dashboard, then rerun.'
              : 'Resolve provider validation/account access before rerun.',
        }),
        { mode: 0o600 },
      );
    process.stderr.write(
      JSON.stringify({
        ok: false,
        status: status ?? null,
        error:
          status === 403
            ? 'Retell denied number access. Complete KYC in the dashboard.'
            : 'Number creation did not finish; inspect the private manifest and reconcile before retry.',
      }) + '\n',
    );
    process.exit(1);
  }
}
if (number.phone_number_type !== 'retell-twilio')
  throw new Error('Unexpected phone resource type; stop and inspect new resource.');
env.RETELL_JLM_PHONE_NUMBER = number.phone_number;
writeFileSync(
  opts.env,
  Object.entries(env)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('\n'),
);
writeFileSync(
  opts.manifest,
  JSON.stringify({ stage: 'purchased', at: new Date().toISOString(), number }, null, 2),
  { mode: 0o600 },
);
process.stdout.write(
  JSON.stringify({
    phoneNumber: number.phone_number,
    provider: number.phone_number_type,
    reconciled: found.length === 1,
    defaultAgentBound: false,
    inboundWebhookConfigured: true,
  }) + '\n',
);
