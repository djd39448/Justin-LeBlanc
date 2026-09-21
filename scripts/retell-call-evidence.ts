/** Reads bounded Retell call metadata and writes sanitized evidence without transcript or media. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import Retell from 'retell-sdk';
import { z } from 'zod';

const EnvironmentSchema = z.object({
  RETELL_API_KEY: z.string().min(1),
  RETELL_JLM_AGENT_ID: z.string().min(1),
});

function iso(value: number | undefined): string | null {
  return value === undefined ? null : new Date(value).toISOString();
}

async function main(): Promise<void> {
  const options = new Command()
    .name('retell-call-evidence')
    .description('Fetch bounded metadata for the isolated Retell agent; omit PII and call content')
    .requiredOption('--env <path>', 'Protected runtime env')
    .requiredOption('--since <instant>', 'Inclusive ISO instant for the acceptance window')
    .requiredOption('--output <path>', 'Private or sanitized evidence JSON')
    .parse()
    .opts<{ env: string; since: string; output: string }>();
  const environment = EnvironmentSchema.parse(parseEnv(readFileSync(options.env, 'utf8')));
  const since = z.iso.datetime({ offset: true }).parse(options.since);
  const client = new Retell({
    apiKey: environment.RETELL_API_KEY,
    maxRetries: 0,
    timeout: 20_000,
  });
  const response = await client.call.list({
    limit: 10,
    sort_order: 'descending',
    filter_criteria: {
      agent: [{ agent_id: environment.RETELL_JLM_AGENT_ID }],
      start_timestamp: { type: 'number', op: 'ge', value: Date.parse(since) },
    },
  });
  const calls = response.items.flatMap((call) => {
    if (call.agent_id !== environment.RETELL_JLM_AGENT_ID || call.call_type !== 'phone_call') {
      return [];
    }
    return [
      {
        callRef: createHash('sha256').update(call.call_id).digest('hex').slice(0, 16),
        agentVersion: call.agent_version,
        status: call.call_status,
        direction: call.direction,
        startedAt: iso(call.start_timestamp),
        endedAt: iso(call.end_timestamp),
        durationMs: call.duration_ms ?? null,
        disconnectionReason: call.disconnection_reason ?? null,
        successful: call.call_analysis?.call_successful ?? null,
        costCents: call.call_cost?.combined_cost ?? null,
      },
    ];
  });
  const evidence = {
    checkedAt: new Date().toISOString(),
    since,
    agentScoped: true,
    boundedLimit: 10,
    hasMore: response.has_more,
    calls,
    omitted: ['phone_numbers', 'transcripts', 'recordings', 'summaries', 'provider_call_ids'],
  };
  writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
  process.stdout.write(
    `${JSON.stringify({ ok: true, calls: calls.length, statuses: calls.map((call) => call.status) })}\n`,
  );
}

void main().catch((error: unknown) => {
  process.stderr.write(
    `${JSON.stringify({ ok: false, reason: error instanceof Error ? error.message : 'Unknown failure.' })}\n`,
  );
  process.exitCode = 1;
});
