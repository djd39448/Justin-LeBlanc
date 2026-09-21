/** Rejects calls before connection unless the verified demo caller and voice gate match.
 * Dependencies: Retell raw signature verifier, Zod, runtime store. Consumers: number-level webhook.
 * Why: a lifecycle webhook cannot stop phone charges; admission must happen before connection. */
import type { Hono } from 'hono';
import { z } from 'zod';

import { verifyRetellSignature } from './assistants/retell.js';
import type { Runtime } from './runtime.js';

const InboundSchema = z.object({
  event: z.literal('call_inbound'),
  call_inbound: z.object({
    call_id: z.string().min(1).max(200),
    from_number: z.string(),
    to_number: z.string(),
  }),
});
const DecisionSchema = z.object({ kind: z.literal('voice_admission'), allowed: z.boolean() });
/** A failed/unavailable endpoint has no default bound agent on this demo number. */
export function mountInboundRoutes(
  app: Hono,
  runtime: Runtime,
  verify = verifyRetellSignature,
): void {
  app.post('/api/retell/inbound', async (c) => {
    const reject = () => c.json({ call_inbound: { reject: true } });
    let text: string;
    try {
      text = await verify(
        new Uint8Array(await c.req.arrayBuffer()),
        c.req.header('X-Retell-Signature') ?? '',
        runtime.config,
      );
    } catch {
      return reject();
    }
    const parsed = InboundSchema.safeParse(JSON.parse(text) as unknown);
    if (!parsed.success) return reject();
    const call = parsed.data.call_inbound;
    const allowed = runtime.config.DEMO_CALLER_ALLOWLIST.split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (
      !runtime.config.VOICE_ENABLED ||
      !runtime.config.RETELL_JLM_AGENT_ID ||
      call.to_number !== runtime.config.RETELL_JLM_PHONE_NUMBER ||
      !allowed.includes(call.from_number)
    )
      return reject();
    const key = `voice-admission:${call.call_id}`;
    const decision = runtime.store.transaction(() => {
      const prior = runtime.store.find('processed_events', key, DecisionSchema);
      if (prior) return prior.data.allowed;
      const count = runtime.store.nextSequence(
        `voice-calls:${new Date().toISOString().slice(0, 10)}`,
      );
      const admitted = count <= runtime.config.VOICE_DAILY_CALL_LIMIT;
      runtime.store.insert('processed_events', key, { kind: 'voice_admission', allowed: admitted });
      return admitted;
    });
    if (!decision) return reject();
    return c.json({
      call_inbound: {
        override_agent_id: runtime.config.RETELL_JLM_AGENT_ID,
        metadata: {
          demo: true,
          kbVersion: runtime.knowledge.version,
          kbHash: runtime.knowledge.hash,
        },
      },
    });
  });
}
