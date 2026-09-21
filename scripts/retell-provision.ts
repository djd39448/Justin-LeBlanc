/**
 * Provisions one new isolated Retell LLM and agent; it never updates or binds a phone number.
 *
 * Dependencies: Commander, Retell SDK, canonical KB, and public assistant tool schemas.
 * Depended on by: operator setup after explicit provider-write authorization.
 * Usage: npx tsx scripts/retell-provision.ts --voice-id <approved-id> [--execute]
 */
import { pathToFileURL } from 'node:url';

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
        'Never claim a tentative hold is confirmed or invent facts, repertoire, rates, availability, scarcity, testimonials, or response times.',
        'Read back email, date, time, timezone, and price and invite corrections before a write.',
        'Unknown facts require request_human_followup.',
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

async function main(): Promise<void> {
  const options = new Command()
    .name('retell-provision')
    .description('Create a new demo Retell LLM and agent without modifying existing resources.')
    .requiredOption('--voice-id <id>', 'Approved Retell voice ID for the new agent')
    .option('--execute', 'Perform the provider writes; omitted means a safe dry run')
    .parse()
    .opts<{ voiceId: string; execute?: boolean }>();
  const environment = EnvironmentSchema.parse(process.env);
  const plan = buildRetellProvisionPlan(environment.API_URL, options.voiceId);
  if (options.execute !== true) {
    process.stdout.write(
      `${JSON.stringify({
        dryRun: true,
        creates: ['retell_llm', 'retell_agent'],
        agentName: plan.agent.agent_name,
        model: plan.llm.model,
        voiceId: plan.agent.voice_id,
        webhookUrl: plan.agent.webhook_url,
        toolNames: plan.llm.general_tools.map((tool) => tool.name),
        kbVersion: plan.kbVersion,
        kbHash: plan.kbHash,
        phoneNumberAction: 'none',
      })}\n`,
    );
    return;
  }

  const client = new Retell({ apiKey: environment.RETELL_API_KEY });
  const llm = await client.llm.create(plan.llm);
  try {
    const agent = await client.agent.create({
      ...plan.agent,
      response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    });
    process.stdout.write(
      `${JSON.stringify({
        created: true,
        llmId: llm.llm_id,
        agentId: agent.agent_id,
        kbVersion: plan.kbVersion,
        phoneNumberAction: 'none',
      })}\n`,
    );
  } catch {
    throw new Error(
      `Retell agent creation failed after new LLM ${llm.llm_id} was created; review that orphan in the Retell dashboard.`,
    );
  }
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href) {
  void main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown Retell provisioning error.';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
