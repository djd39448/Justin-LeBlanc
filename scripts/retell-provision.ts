/**
 * Provisions one new isolated Retell LLM and agent; it never updates or binds a phone number.
 *
 * Dependencies: Commander, Retell SDK, canonical KB, and public assistant tool schemas.
 * Depended on by: operator setup after explicit provider-write authorization.
 * Usage: npx tsx scripts/retell-provision.ts --env <runtime.env> --manifest <json> --execute
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseEnv } from 'node:util';

import { Command } from 'commander';
import Retell from 'retell-sdk';
import { z } from 'zod';

import { publicAssistantTools } from '../apps/api/assistants/tools.js';
import { loadKnowledgeRelease, renderAssistantContext } from '../kb/release.js';

const EnvironmentSchema = z.object({
  API_URL: z.url(),
  RETELL_API_KEY: z.string().min(1),
});
const ToolParametersSchema = z.object({
  type: z.literal('object'),
  properties: z.record(z.string(), z.unknown()),
  required: z.array(z.string()).optional(),
});
export const ProvisionManifestSchema = z.object({
  version: z.literal(1),
  stage: z.enum(['llm_created', 'agent_created', 'agent_reconciled']),
  agentName: z.string(),
  agentId: z.string().nullable(),
  llmId: z.string(),
  voiceId: z.string(),
  kbVersion: z.string(),
  kbHash: z.string(),
  apiUrl: z.url(),
  phoneNumberId: z.null(),
  recordedAt: z.iso.datetime({ offset: true }),
});
export type ProvisionManifest = z.infer<typeof ProvisionManifestSchema>;

export type ProtectedProvisionDisposition =
  'unprotected' | 'reconcile_protected' | 'refresh_protected';

/** Keeps a durable provider identity stable when the canonical KB changes. */
export function protectedProvisionDisposition(
  manifest: ProvisionManifest | undefined,
  knowledge: { version: string; hash: string },
): ProtectedProvisionDisposition {
  if (manifest?.agentId === undefined || manifest.agentId === null) return 'unprotected';
  return manifest.kbVersion === knowledge.version && manifest.kbHash === knowledge.hash
    ? 'reconcile_protected'
    : 'refresh_protected';
}

interface RetellProvisionTool {
  name: string;
  type: 'custom';
  url: string;
  args_at_root: false;
  description: string;
  max_retry: number;
  method: 'POST';
  parameter_type: 'json';
  parameters: z.infer<typeof ToolParametersSchema>;
  speak_after_execution: true;
  speak_during_execution: boolean;
  timeout_ms: number;
}

export interface RetellProvisionPlan {
  kbVersion: string;
  kbHash: string;
  llm: {
    begin_message: string;
    general_prompt: string;
    general_tools: RetellProvisionTool[];
    model: 'gpt-4.1-mini';
    model_temperature: number;
    start_speaker: 'agent';
    tool_call_strict_mode: true;
  };
  agent: {
    agent_name: string;
    max_call_duration_ms: number;
    response_engine: { type: 'retell-llm'; llm_id: string };
    voice_id: string;
    webhook_events: ('call_started' | 'call_ended' | 'call_analyzed')[];
    webhook_url: string;
    webhook_timeout_ms: number;
  };
}

/** Builds the exact new-resource request without credentials or provider writes. */
export function buildRetellProvisionPlan(apiUrl: string, voiceId: string): RetellProvisionPlan {
  const publicUrl = requirePublicHttps(apiUrl);
  const knowledge = loadKnowledgeRelease();
  const toolUrl = new URL('/api/retell/tools', publicUrl).toString();
  const webhookUrl = new URL('/api/webhooks/retell', publicUrl).toString();
  const tools: RetellProvisionTool[] = publicAssistantTools().map((tool) => ({
    name: tool.name,
    type: 'custom',
    url: toolUrl,
    args_at_root: false,
    description: tool.description,
    max_retry: 0,
    method: 'POST',
    parameter_type: 'json',
    parameters: ToolParametersSchema.parse(tool.parameters),
    speak_after_execution: true,
    speak_during_execution: tool.name === 'get_availability',
    timeout_ms: 15_000,
  }));
  return {
    kbVersion: knowledge.version,
    kbHash: knowledge.hash,
    llm: {
      begin_message:
        "Hi, I'm an AI booking assistant for Justin LeBlanc's demo. How can I help with your event?",
      general_prompt: [
        'You are the dedicated AI voice booking assistant for the isolated Justin LeBlanc demo.',
        'Never imply that you are Justin. Keep replies concise and natural for a phone call.',
        'Use tools for facts, estimates, availability, and booking writes.',
        'Before answering a business-fact question, call search_knowledge with that question and base the answer on returned supported facts.',
        'Never claim a tentative hold is confirmed or invent facts, repertoire, rates, availability, scarcity, testimonials, or response times.',
        'Read back email, date, time, timezone, and price and invite corrections before a write.',
        'When a fact is unknown or search_knowledge is unsupported, collect the needed details before calling request_human_followup or saying it was captured or arranged.',
        'Without an inquiry association, collect intake details first and do not claim follow-up was captured.',
        renderAssistantContext(knowledge),
      ].join('\n\n'),
      general_tools: tools,
      model: 'gpt-4.1-mini',
      model_temperature: 0,
      start_speaker: 'agent',
      tool_call_strict_mode: true,
    },
    agent: {
      agent_name: `jlm-demo-booking-assistant-${knowledge.version}`,
      max_call_duration_ms: 300_000,
      response_engine: { type: 'retell-llm', llm_id: '' },
      voice_id: z.string().trim().min(1).parse(voiceId),
      webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
      webhook_url: webhookUrl,
      webhook_timeout_ms: 10_000,
    },
  };
}

function requirePublicHttps(rawUrl: string): URL {
  const url = new URL(rawUrl);
  const hostname = url.hostname.toLowerCase();
  const privateHost =
    hostname === 'localhost' ||
    hostname === '::1' ||
    hostname.endsWith('.local') ||
    hostname.startsWith('127.') ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('169.254.') ||
    /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname);
  if (url.protocol !== 'https:' || privateHost) {
    throw new Error('API_URL must be a public HTTPS endpoint before Retell provisioning.');
  }
  return url;
}

async function findExactAgent(client: Retell, agentName: string) {
  const matches = [];
  let paginationKey: string | undefined;
  do {
    const page = await client.agent.list({
      limit: 100,
      pagination_key: paginationKey,
      filter_criteria: {
        channel: { type: 'string', op: 'eq', value: 'voice' },
        query: agentName,
      },
    });
    matches.push(...page.items.filter((item) => item.agent_name === agentName));
    paginationKey = page.has_more ? page.pagination_key : undefined;
  } while (paginationKey !== undefined);
  if (matches.length > 1) {
    throw new Error(
      `More than one exact Retell agent named ${agentName}; stop for reconciliation.`,
    );
  }
  return matches[0];
}

async function choosePlatformVoice(client: Retell): Promise<string> {
  const voices = await client.voice.list();
  const candidates = voices
    .filter((voice) => voice.provider === 'platform' && voice.gender === 'male')
    .sort(
      (left, right) =>
        left.voice_name.localeCompare(right.voice_name) ||
        left.voice_id.localeCompare(right.voice_id),
    );
  const selected = candidates[0];
  if (selected === undefined) {
    throw new Error('No standard male platform voice is available in this Retell account.');
  }
  return selected.voice_id;
}

function readManifest(path: string): ProvisionManifest | undefined {
  try {
    return ProvisionManifestSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
    throw new Error('Retell provision manifest is malformed; reconcile it before retrying.');
  }
}

function persistProvision(
  envPath: string,
  manifestPath: string,
  environment: Record<string, string>,
  manifest: ProvisionManifest,
): void {
  environment.RETELL_JLM_AGENT_ID = manifest.agentId ?? '';
  environment.RETELL_JLM_LLM_ID = manifest.llmId;
  environment.RETELL_JLM_VOICE_ID = manifest.voiceId;
  writeFileSync(
    envPath,
    `${Object.entries(environment)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join('\n')}\n`,
    { mode: 0o600 },
  );
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
}

async function provision(
  client: Retell,
  apiUrl: string,
  requestedVoiceId: string | undefined,
  envPath: string,
  manifestPath: string,
  environment: Record<string, string>,
): Promise<{ agentId: string; llmId: string; voiceId: string; reconciled: boolean }> {
  const knowledge = loadKnowledgeRelease();
  const agentName = `jlm-demo-booking-assistant-${knowledge.version}`;
  const prior = readManifest(manifestPath);
  const protectedDisposition = protectedProvisionDisposition(prior, knowledge);
  if (prior?.agentId !== undefined && prior.agentId !== null) {
    if (prior.apiUrl !== apiUrl) {
      throw new Error(
        'The protected Retell identity uses a different API URL; refresh it in place before provisioning.',
      );
    }
    if (requestedVoiceId !== undefined && requestedVoiceId !== prior.voiceId) {
      throw new Error(
        'The requested voice differs from the protected Retell identity; refresh it in place before provisioning.',
      );
    }
    let protectedAgent;
    let protectedLlm;
    try {
      protectedAgent = await client.agent.retrieve(prior.agentId);
      protectedLlm = await client.llm.retrieve(prior.llmId);
    } catch {
      throw new Error(
        'The protected Retell agent or LLM could not be retrieved by its recorded ID; no resources were created.',
      );
    }
    const expectedWebhook = buildRetellProvisionPlan(apiUrl, prior.voiceId).agent.webhook_url;
    if (
      protectedAgent.agent_id !== prior.agentId ||
      protectedAgent.response_engine.type !== 'retell-llm' ||
      protectedAgent.response_engine.llm_id !== prior.llmId ||
      protectedLlm.llm_id !== prior.llmId ||
      protectedAgent.voice_id !== prior.voiceId ||
      protectedAgent.webhook_url !== expectedWebhook
    ) {
      throw new Error(
        'The protected Retell identity no longer matches its recorded agent, LLM, voice, or webhook; no resources were created.',
      );
    }
    if (protectedDisposition === 'refresh_protected') {
      throw new Error(
        'The protected Retell identity is verified but its KB release differs. Run scripts/retell-refresh.ts with --env, --provision-manifest, and a release-specific --release-manifest; do not rerun new-resource provisioning.',
      );
    }
    persistProvision(envPath, manifestPath, environment, {
      ...prior,
      stage: 'agent_reconciled',
      recordedAt: new Date().toISOString(),
    });
    return {
      agentId: protectedAgent.agent_id,
      llmId: prior.llmId,
      voiceId: protectedAgent.voice_id,
      reconciled: true,
    };
  }
  let exactAgent;
  try {
    exactAgent = await findExactAgent(client, agentName);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('More than one exact')) throw error;
    throw new Error('Retell agent reconciliation failed; no resources were created.');
  }
  if (exactAgent !== undefined) {
    const agent = await client.agent.retrieve(exactAgent.agent_id);
    if (agent.response_engine.type !== 'retell-llm') {
      throw new Error('The exact demo agent exists with an unexpected response engine.');
    }
    const manifest: ProvisionManifest = {
      version: 1,
      stage: 'agent_reconciled',
      agentName,
      agentId: agent.agent_id,
      llmId: agent.response_engine.llm_id,
      voiceId: agent.voice_id,
      kbVersion: knowledge.version,
      kbHash: knowledge.hash,
      apiUrl,
      phoneNumberId: null,
      recordedAt: new Date().toISOString(),
    };
    persistProvision(envPath, manifestPath, environment, manifest);
    return {
      agentId: agent.agent_id,
      llmId: agent.response_engine.llm_id,
      voiceId: agent.voice_id,
      reconciled: true,
    };
  }

  if (prior !== undefined && prior.agentName === agentName && prior.agentId !== null) {
    throw new Error(
      'The protected manifest names an agent that Retell did not return; stop safely.',
    );
  }
  const reusable =
    prior !== undefined &&
    prior.stage === 'llm_created' &&
    prior.agentName === agentName &&
    prior.kbHash === knowledge.hash &&
    prior.apiUrl === apiUrl
      ? prior
      : undefined;
  const voiceId = reusable?.voiceId ?? requestedVoiceId ?? (await choosePlatformVoice(client));
  const plan = buildRetellProvisionPlan(apiUrl, voiceId);
  let llmId = reusable?.llmId;
  if (llmId === undefined) {
    const llm = await client.llm.create(plan.llm);
    llmId = llm.llm_id;
    persistProvision(envPath, manifestPath, environment, {
      version: 1,
      stage: 'llm_created',
      agentName,
      agentId: null,
      llmId,
      voiceId,
      kbVersion: knowledge.version,
      kbHash: knowledge.hash,
      apiUrl,
      phoneNumberId: null,
      recordedAt: new Date().toISOString(),
    });
  }
  try {
    const agent = await client.agent.create({
      ...plan.agent,
      response_engine: { type: 'retell-llm', llm_id: llmId },
    });
    persistProvision(envPath, manifestPath, environment, {
      version: 1,
      stage: 'agent_created',
      agentName,
      agentId: agent.agent_id,
      llmId,
      voiceId,
      kbVersion: knowledge.version,
      kbHash: knowledge.hash,
      apiUrl,
      phoneNumberId: null,
      recordedAt: new Date().toISOString(),
    });
    return { agentId: agent.agent_id, llmId, voiceId, reconciled: false };
  } catch {
    throw new Error(
      `Retell agent creation failed after new LLM ${llmId} was persisted; retry will reuse it.`,
    );
  }
}

async function main(): Promise<void> {
  const options = new Command()
    .name('retell-provision')
    .description('Create a new demo Retell LLM and agent without modifying existing resources.')
    .requiredOption('--env <path>', 'Protected runtime env; provider IDs are persisted here')
    .requiredOption('--manifest <path>', 'Protected idempotency manifest path')
    .option('--voice-id <id>', 'Existing standard voice ID; omitted selects a platform voice')
    .option('--execute', 'Perform provider writes; omitted prints a safe local plan')
    .parse()
    .opts<{ env: string; manifest: string; voiceId?: string; execute?: boolean }>();
  const environment = z
    .record(z.string(), z.string())
    .parse(parseEnv(readFileSync(options.env, 'utf8')));
  const checkedEnvironment = EnvironmentSchema.parse(environment);
  if (options.execute !== true) {
    const voiceId = options.voiceId ?? 'auto-select-standard-platform-voice';
    const plan = buildRetellProvisionPlan(checkedEnvironment.API_URL, voiceId);
    process.stdout.write(
      `${JSON.stringify({
        dryRun: true,
        reconciliation: 'exact agent name before create',
        creates: ['retell_llm', 'retell_agent'],
        agentName: plan.agent.agent_name,
        model: plan.llm.model,
        voiceId,
        webhookUrl: plan.agent.webhook_url,
        toolNames: plan.llm.general_tools.map((tool) => tool.name),
        kbVersion: plan.kbVersion,
        kbHash: plan.kbHash,
        phoneNumberAction: 'none',
      })}\n`,
    );
    return;
  }

  const client = new Retell({
    apiKey: checkedEnvironment.RETELL_API_KEY,
    maxRetries: 0,
    timeout: 20_000,
  });
  const result = await provision(
    client,
    checkedEnvironment.API_URL,
    options.voiceId,
    options.env,
    options.manifest,
    environment,
  );
  process.stdout.write(
    `${JSON.stringify({
      provisioned: true,
      reconciled: result.reconciled,
      agentId: result.agentId,
      llmId: result.llmId,
      voiceId: result.voiceId,
      phoneNumberAction: 'none',
    })}\n`,
  );
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown Retell provisioning error.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
