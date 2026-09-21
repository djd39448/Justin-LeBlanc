/** Refreshes one protected Retell agent identity through a new published version.
 * Dependencies: Retell SDK, canonical provision plan, protected env/manifests.
 * Why: KB and prompt releases must update the existing demo identity without creating agents or LLMs. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import Retell from 'retell-sdk';
import { z } from 'zod';

import {
  buildRetellProvisionPlan,
  ProvisionManifestSchema,
  type RetellProvisionPlan,
} from './retell-provision.js';

const EnvironmentSchema = z.object({
  API_URL: z.url(),
  RETELL_API_KEY: z.string().min(1),
  RETELL_JLM_AGENT_ID: z.string().min(1),
  RETELL_JLM_LLM_ID: z.string().min(1),
  RETELL_JLM_VOICE_ID: z.string().min(1),
});
const RefreshManifestSchema = z.object({
  version: z.literal(1),
  stage: z.enum([
    'draft_create_started',
    'draft_created',
    'draft_reconciled',
    'llm_update_started',
    'llm_updated',
    'publish_started',
    'published_verified',
  ]),
  agentId: z.string(),
  llmId: z.string(),
  voiceId: z.string(),
  apiUrl: z.url(),
  kbVersion: z.string(),
  kbHash: z.string(),
  planFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  baseAgentVersion: z.number().int().nonnegative(),
  targetAgentVersion: z.number().int().nonnegative().nullable(),
  targetLlmVersion: z.number().int().nonnegative().nullable(),
  recordedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
type RefreshManifest = z.infer<typeof RefreshManifestSchema>;

/** Hashes the complete LLM plan, including prompt and nested custom-tool parameters. */
export function retellPlanFingerprint(plan: RetellProvisionPlan): string {
  return createHash('sha256').update(stable(plan.llm)).digest('hex');
}

/** Compares every expected nested value while allowing provider-added default fields. */
export function matchesExpectedSubset(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matchesExpectedSubset(actual[index], item))
    );
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false;
    const actualRecord = z.record(z.string(), z.unknown()).parse(actual);
    return Object.entries(expected).every(([key, value]) =>
      matchesExpectedSubset(actualRecord[key], value),
    );
  }
  return Object.is(actual, expected);
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveRefresh(path: string, manifest: RefreshManifest): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  );
}

async function listAgentVersions(client: Retell, agentId: string) {
  let page = await client.agent.listVersions(agentId, { limit: 100 });
  const versions = [...page.items];
  while (page.has_more) {
    if (!page.pagination_key) throw new Error('Agent-version pagination is incomplete.');
    page = await client.agent.listVersions(agentId, {
      limit: 100,
      pagination_key: page.pagination_key,
    });
    versions.push(...page.items);
  }
  return versions;
}

async function run(): Promise<void> {
  const options = new Command()
    .name('retell-refresh')
    .description('Refresh the protected Retell identity in place through one versioned release')
    .requiredOption('--env <path>', 'Protected runtime env')
    .requiredOption('--provision-manifest <path>', 'Protected identity manifest')
    .requiredOption('--release-manifest <path>', 'One durable manifest for this exact release')
    .option('--execute', 'Create/update/publish the version; default is provider-read-only dry run')
    .parse()
    .opts<{
      env: string;
      provisionManifest: string;
      releaseManifest: string;
      execute?: boolean;
    }>();
  const environment = EnvironmentSchema.parse(parseEnv(readFileSync(options.env, 'utf8')));
  const identity = ProvisionManifestSchema.parse(readJson(options.provisionManifest));
  if (
    identity.agentId === null ||
    identity.agentId !== environment.RETELL_JLM_AGENT_ID ||
    identity.llmId !== environment.RETELL_JLM_LLM_ID ||
    identity.voiceId !== environment.RETELL_JLM_VOICE_ID ||
    identity.apiUrl !== environment.API_URL
  ) {
    throw new Error('Environment and protected Retell identity manifest do not match exactly.');
  }
  const plan = buildRetellProvisionPlan(environment.API_URL, identity.voiceId);
  const fingerprint = retellPlanFingerprint(plan);
  const client = new Retell({
    apiKey: environment.RETELL_API_KEY,
    maxRetries: 0,
    timeout: 20_000,
  });
  const currentAgent = await client.agent.retrieve(identity.agentId);
  if (
    currentAgent.agent_id !== identity.agentId ||
    currentAgent.response_engine.type !== 'retell-llm' ||
    currentAgent.response_engine.llm_id !== identity.llmId ||
    currentAgent.voice_id !== identity.voiceId ||
    currentAgent.webhook_url !== plan.agent.webhook_url
  ) {
    throw new Error(
      'Provider identity differs from the protected manifest; no refresh was attempted.',
    );
  }
  const versions = await listAgentVersions(client, identity.agentId);
  let manifest = existsSync(options.releaseManifest)
    ? RefreshManifestSchema.parse(readJson(options.releaseManifest))
    : undefined;
  if (manifest !== undefined) {
    if (
      manifest.agentId !== identity.agentId ||
      manifest.llmId !== identity.llmId ||
      manifest.voiceId !== identity.voiceId ||
      manifest.apiUrl !== identity.apiUrl ||
      manifest.kbVersion !== plan.kbVersion ||
      manifest.kbHash !== plan.kbHash ||
      manifest.planFingerprint !== fingerprint
    ) {
      throw new Error('Release manifest belongs to another identity or plan; refusing reuse.');
    }
  }
  if (manifest === undefined) {
    const drafts = versions.filter((version) => !version.is_published);
    if (drafts.length > 0) {
      throw new Error('An untracked agent draft exists; reconcile it before starting a release.');
    }
    const base = versions
      .filter((version) => version.is_published)
      .sort((left, right) => right.version - left.version)[0];
    if (base === undefined) throw new Error('No published base agent version exists.');
    if (options.execute !== true) {
      process.stdout.write(
        `${JSON.stringify({
          dryRun: true,
          agentId: identity.agentId,
          llmId: identity.llmId,
          baseAgentVersion: base.version,
          kbVersion: plan.kbVersion,
          kbHash: plan.kbHash,
          planFingerprint: fingerprint,
          action: 'create_update_publish_one_version',
          newResourceIdentities: 0,
        })}\n`,
      );
      return;
    }
    const now = new Date().toISOString();
    manifest = {
      version: 1,
      stage: 'draft_create_started',
      agentId: identity.agentId,
      llmId: identity.llmId,
      voiceId: identity.voiceId,
      apiUrl: identity.apiUrl,
      kbVersion: plan.kbVersion,
      kbHash: plan.kbHash,
      planFingerprint: fingerprint,
      baseAgentVersion: base.version,
      targetAgentVersion: null,
      targetLlmVersion: null,
      recordedAt: now,
      updatedAt: now,
    };
    saveRefresh(options.releaseManifest, manifest);
    let draft;
    try {
      draft = await client.agent.createVersion(identity.agentId, { base_version: base.version });
    } catch {
      throw new Error(
        'Agent draft creation is uncertain. Rerun to reconcile the recorded attempt; do not create manually.',
      );
    }
    const createdVersion = z.number().int().nonnegative().parse(draft.version);
    manifest = { ...manifest, stage: 'draft_created', targetAgentVersion: createdVersion };
    saveRefresh(options.releaseManifest, manifest);
  } else if (manifest.targetAgentVersion === null) {
    const baseAgentVersion = manifest.baseAgentVersion;
    const candidates = versions.filter(
      (version) => !version.is_published && version.version > baseAgentVersion,
    );
    if (candidates.length !== 1) {
      throw new Error(
        'Draft creation could not be reconciled to exactly one provider version; no retry occurred.',
      );
    }
    manifest = {
      ...manifest,
      stage: 'draft_reconciled',
      targetAgentVersion: candidates[0]?.version ?? null,
    };
    saveRefresh(options.releaseManifest, manifest);
  }

  if (manifest === undefined) throw new Error('Release manifest was not initialized.');
  let release = manifest;
  const targetAgentVersion = release.targetAgentVersion;
  if (targetAgentVersion === null) throw new Error('Reconciled draft version is missing.');
  const draft = await client.agent.retrieve(identity.agentId, { version: targetAgentVersion });
  if (
    draft.response_engine.type !== 'retell-llm' ||
    draft.response_engine.llm_id !== identity.llmId ||
    typeof draft.response_engine.version !== 'number'
  ) {
    throw new Error('Draft response engine does not match the protected LLM identity.');
  }
  const targetLlmVersion = draft.response_engine.version;
  if (release.targetLlmVersion !== null && release.targetLlmVersion !== targetLlmVersion) {
    throw new Error('Release manifest and provider LLM versions differ.');
  }
  let llm = await client.llm.retrieve(identity.llmId, { version: targetLlmVersion });
  if (!matchesExpectedSubset(llm, plan.llm)) {
    if (options.execute !== true) {
      process.stdout.write(
        `${JSON.stringify({ dryRun: true, action: 'update_and_publish_existing_draft' })}\n`,
      );
      return;
    }
    release = { ...release, stage: 'llm_update_started', targetLlmVersion };
    saveRefresh(options.releaseManifest, release);
    await client.llm.update(identity.llmId, { version: targetLlmVersion, ...plan.llm });
    llm = await client.llm.retrieve(identity.llmId, { version: targetLlmVersion });
    if (!matchesExpectedSubset(llm, plan.llm)) {
      throw new Error('LLM read-back differs from the complete expected prompt and tool subset.');
    }
    release = { ...release, stage: 'llm_updated' };
    saveRefresh(options.releaseManifest, release);
  }

  let published = await client.agent.retrieve(identity.agentId, { version: 'latest_published' });
  if (published.version !== targetAgentVersion) {
    if (options.execute !== true) {
      process.stdout.write(
        `${JSON.stringify({ dryRun: true, action: 'publish_existing_draft' })}\n`,
      );
      return;
    }
    release = { ...release, stage: 'publish_started', targetLlmVersion };
    saveRefresh(options.releaseManifest, release);
    try {
      await client.agent.publish(identity.agentId, {
        version: targetAgentVersion,
        version_title: `Knowledge ${plan.kbVersion}`,
        version_description: 'Canonical knowledge, required fact lookup, and safe human follow-up.',
      });
    } catch {
      published = await client.agent.retrieve(identity.agentId, { version: 'latest_published' });
      if (published.version !== targetAgentVersion) {
        throw new Error(
          'Publish outcome is uncertain. Rerun to reconcile latest_published before any retry.',
        );
      }
    }
  }
  published = await client.agent.retrieve(identity.agentId, { version: 'latest_published' });
  llm = await client.llm.retrieve(identity.llmId, { version: targetLlmVersion });
  if (
    published.version !== targetAgentVersion ||
    published.is_published !== true ||
    !matchesExpectedSubset(llm, plan.llm)
  ) {
    throw new Error('Published agent or LLM verification failed.');
  }
  release = { ...release, stage: 'published_verified', targetLlmVersion };
  saveRefresh(options.releaseManifest, release);
  writeFileSync(
    options.provisionManifest,
    `${JSON.stringify(
      {
        ...identity,
        stage: 'agent_reconciled',
        kbVersion: plan.kbVersion,
        kbHash: plan.kbHash,
        recordedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  process.stdout.write(
    `${JSON.stringify({
      refreshed: true,
      agentId: identity.agentId,
      llmId: identity.llmId,
      agentVersion: targetAgentVersion,
      llmVersion: targetLlmVersion,
      kbVersion: plan.kbVersion,
      kbHash: plan.kbHash,
      planFingerprint: fingerprint,
      published: true,
      newResourceIdentities: 0,
    })}\n`,
  );
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void run().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : 'Unknown Retell refresh failure.'}\n`,
    );
    process.exitCode = 1;
  });
}
