/** Compares provider resources to protected preflight snapshots without exposing their contents.
 * Dependencies: filesystem, crypto, provider read APIs and server config. Consumers: release audit.
 * Why: counts alone cannot prove existing agents, phone bindings or DNS records stayed unchanged. */
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { Command } from 'commander';
import { z } from 'zod';

const cli = new Command()
  .requiredOption('--private-directory <path>')
  .requiredOption('--cloudflare-config <path>')
  .option('--output <path>', 'Sanitized evidence path', 'docs/evidence/resource-isolation.json')
  .parse();
const args = cli.opts<{ privateDirectory: string; cloudflareConfig: string; output: string }>();
const cfConfig = await readFile(args.cloudflareConfig, 'utf8');
const token = /oauth_token\s*=\s*"([^"]+)"/.exec(cfConfig)?.[1];
if (!token || !process.env.RETELL_API_KEY)
  throw new Error('Load authorized Retell env and existing Cloudflare config before audit.');
const account = 'b393d8ff72d57912119b872640d3511f';
const evidence: { at: string; providers: Record<string, unknown>; dns?: unknown } = {
  at: new Date().toISOString(),
  providers: {},
};
for (const [name, url, key, idKey] of [
  ['retellAgents', 'https://api.retellai.com/list-agents', process.env.RETELL_API_KEY, 'agent_id'],
  [
    'retellNumbers',
    'https://api.retellai.com/list-phone-numbers',
    process.env.RETELL_API_KEY,
    'phone_number',
  ],
  [
    'cfPages',
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`,
    token,
    'id',
  ],
] as const) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(`${name} read failed HTTP${response.status}; no isolation pass recorded.`);
  const after: unknown = await response.json();
  const before: unknown = JSON.parse(
    await readFile(join(args.privateDirectory, `${name}-before.json`), 'utf8'),
  );
  await writeFile(join(args.privateDirectory, `${name}-after.json`), JSON.stringify(after));
  const oldRows = rows(before),
    newRows = rows(after);
  // Retell list-agents returns every version, so agent_id alone is not a unique key.
  const identity = (row: Record<string, unknown>) =>
    String(row[idKey]) + (name === 'retellAgents' ? `:${String(row['version'])}` : '');
  const newMap = new Map(newRows.map((row) => [identity(row), row]));
  const changed = oldRows.filter((row) => stable(row) !== stable(newMap.get(identity(row))));
  evidence.providers[name] = {
    before: oldRows.length,
    after: newRows.length,
    existingUnchanged: changed.length === 0,
    changedExistingCount: changed.length,
    baselineSha256: hash(stable(oldRows)),
    existingAfterSha256: hash(stable(oldRows.map((row) => newMap.get(identity(row))))),
  };
}
const beforeDns = dnsRows(await readFile(join(args.privateDirectory, 'dns-before.txt'), 'utf8'));
const afterDns = dnsRows(await readFile(join(args.privateDirectory, 'dns-after.txt'), 'utf8'));
const removed = beforeDns.filter((row) => !afterDns.includes(row));
const added = afterDns.filter((row) => !beforeDns.includes(row));
evidence.dns = {
  before: beforeDns.length,
  after: afterDns.length,
  removedOrChangedExisting: removed.length,
  addedCount: added.length,
  addedOnlyJustin: added.every((row) =>
    /^(justinleblancmusic|jlm-demo-api)\.50by50\.dev\./.test(row),
  ),
  baselineSha256: hash(stable(beforeDns)),
  afterSha256: hash(stable(afterDns)),
};
await mkdir('docs/evidence', { recursive: true });
await writeFile(args.output, JSON.stringify(evidence, null, 2) + '\n');
process.stdout.write(JSON.stringify(evidence, null, 2) + '\n');
function rows(value: unknown): Record<string, unknown>[] {
  const parsed = z
    .union([
      z.array(z.record(z.string(), z.unknown())),
      z.object({ result: z.array(z.record(z.string(), z.unknown())) }),
    ])
    .parse(value);
  return Array.isArray(parsed) ? parsed : parsed.result;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => JSON.stringify(key) + ':' + stable(item))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'undefined';
}
function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function dnsRows(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.split(';')[0]?.trim() ?? '')
    .filter((line) => /\sIN\s+(?:A|AAAA|CNAME|MX|TXT|SRV|CAA|NS)\s/.test(line))
    .map((line) => line.replace(/\s+/g, ' '))
    .sort();
}
