/** Exposes public intake and authenticated operator routes.
 * Dependencies: Hono, contracts, pricing/time, security and composed services.
 * Consumers: Node server, integration tests. Why: HTTP is a thin validated boundary. */
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';

import { InquiryInputSchema, ScheduleInputSchema } from '../../packages/contracts/index.js';
import { EstimateInputSchema, estimateEvent } from '../../packages/domain/pricing.js';
import { localDateTimeToInstant } from '../../packages/domain/time.js';

import {
  PUBLIC_EVENTS_UNAVAILABLE,
  PublicEventsUnavailableError,
} from './adapters/public-events.js';
import { chatTurn } from './chat-session.js';
import { mountInboundRoutes } from './inbound-routes.js';
import { operatorAction } from './operator-actions.js';
import { mountOperatorRoutes } from './operator-routes.js';
import type { Runtime } from './runtime.js';
import { boundary, rateLimit, resumeToken, requireToken } from './security.js';
import { mountVoiceRoutes, RETELL_MAX_BODY_BYTES } from './voice-routes.js';

const PUBLIC_MAX_BODY_BYTES = 32 * 1024;

/** Builds routes against injected persistent services; does not start a network listener. */
export function createApp(runtime: Runtime): Hono {
  const app = new Hono();
  app.use('*', boundary(runtime.config));
  app.use('*', (c, next) =>
    bodyLimit({
      maxSize:
        c.req.path === '/api/retell/tools' || c.req.path === '/api/webhooks/retell'
          ? RETELL_MAX_BODY_BYTES
          : PUBLIC_MAX_BODY_BYTES,
      onError: (context) => context.json({ error: 'body_too_large' }, 413),
    })(c, next),
  );
  app.get('/api/health', (c) =>
    c.json({
      ok: true,
      demo: true,
      kbVersion: runtime.knowledge.version,
      kbHash: runtime.knowledge.hash,
      capabilities: {
        booking: runtime.config.BOOKING_WRITES_ENABLED,
        chat: runtime.config.AI_ENABLED,
        voice: runtime.config.VOICE_ENABLED,
        billing: runtime.config.INVOICE_SEND_ENABLED,
      },
    }),
  );
  app.get('/api/public-events', async (c) => {
    try {
      const projection = await runtime.publicEvents.read();
      c.header('Cache-Control', 'public, max-age=60, stale-while-revalidate=240');
      return c.json(projection);
    } catch (error) {
      if (!(error instanceof PublicEventsUnavailableError)) {
        console.error(
          JSON.stringify({
            event: 'public_events_route_failed',
            error: error instanceof Error ? error.name : 'UnknownError',
            remedy:
              'Inspect the Public Shows reader and keep PUBLIC_EVENTS_ENABLED=false until resolved.',
          }),
        );
      }
      c.header('Cache-Control', 'no-store');
      c.header('Retry-After', '300');
      return c.json(PUBLIC_EVENTS_UNAVAILABLE, 503);
    }
  });
  app.use('/api/inquiries*', rateLimit(runtime.store));
  app.use('/api/chat', rateLimit(runtime.store, 10));
  app.use('/api/bookings', rateLimit(runtime.store, 10));
  app.use('/api/availability', rateLimit(runtime.store, 20));
  app.post('/api/inquiries', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const receipt = runtime.booking.upsertInquiry({
      input: InquiryInputSchema.parse(body),
      idempotencyKey: c.req.header('Idempotency-Key'),
      providedFields: new Set(Object.keys(body)),
    });
    return c.json(
      {
        id: receipt.inquiryId,
        token: receipt.resumeToken,
        status: receipt.status,
        missingFields: [],
      },
      201,
    );
  });
  app.get('/api/inquiries/:id', (c) =>
    c.json(runtime.booking.inspectInquiry(c.req.param('id'), resumeToken(c))),
  );
  app.put('/api/inquiries/:id', async (c) => {
    const body = (await c.req.json()) as Record<string, unknown>;
    const receipt = runtime.booking.upsertInquiry({
      input: InquiryInputSchema.parse(body),
      inquiryId: c.req.param('id'),
      resumeToken: resumeToken(c),
      providedFields: new Set(Object.keys(body)),
    });
    return c.json({
      id: receipt.inquiryId,
      token: receipt.resumeToken,
      status: receipt.status,
      missingFields: [],
    });
  });
  app.post('/api/estimate', async (c) =>
    c.json(estimateEvent(EstimateInputSchema.parse(await c.req.json()))),
  );
  app.post('/api/time', async (c) => {
    const input = z
      .object({ local: z.string().max(30), timezone: z.string().max(80) })
      .parse(await c.req.json());
    return c.json({ instant: localDateTimeToInstant(input.local, input.timezone) });
  });
  app.post('/api/availability', async (c) =>
    c.json(
      await runtime.booking.getAvailability(
        z
          .object({
            consultationStart: z.iso.datetime({ offset: true }),
            performanceStart: z.iso.datetime({ offset: true }),
            performanceEnd: z.iso.datetime({ offset: true }),
          })
          .parse(await c.req.json()),
      ),
    ),
  );
  app.post('/api/bookings', async (c) => {
    if (!runtime.config.BOOKING_WRITES_ENABLED)
      return c.json(
        {
          error: 'booking_disabled',
          message: 'Calendar booking is not enabled yet; your inquiry can still be saved.',
        },
        503,
      );
    return c.json(
      await runtime.booking.scheduleConsultationAndHold(
        ScheduleInputSchema.parse(await c.req.json()),
      ),
    );
  });
  app.post('/api/chat', async (c) => c.json(await chatTurn(runtime, await c.req.json())));
  mountVoiceRoutes(app, runtime);
  mountInboundRoutes(app, runtime);
  mountOperatorRoutes(app, runtime);
  app.use('/api/jobs/*', requireToken(runtime.config.JOB_AUTH_SECRET));
  app.post('/api/jobs/run', async (c) => {
    const request = z
      .object({
        action: z.enum([
          'morning',
          'replies-poll',
          'billing-followups',
          'outbox-dispatch',
          'holds-expire',
          'inquiry-followups',
        ]),
      })
      .parse(await c.req.json());
    const result = await operatorAction(runtime, { ...request, force: false });
    return c.newResponse(JSON.stringify({ result }), 200, { 'Content-Type': 'application/json' });
  });
  app.onError((error, c) => {
    if (error instanceof z.ZodError)
      return c.json(
        {
          error: 'validation',
          message: 'Check the highlighted fields.',
          fields: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
        400,
      );
    const secrets = [
      runtime.config.OPENAI_API_KEY,
      runtime.config.RETELL_API_KEY,
      runtime.config.SMTP_PASS,
      runtime.config.GOOGLE_REFRESH_TOKEN,
      runtime.config.ADMIN_TOKEN,
    ].filter(Boolean);
    let message = error.message;
    for (const secret of secrets) message = message.replaceAll(secret, '[redacted]');
    console.error(
      JSON.stringify({
        event: 'request_failed',
        path: c.req.path,
        error: error.name,
        remedy: message.slice(0, 400),
      }),
    );
    return c.json({ error: 'operation_failed', message: message.slice(0, 400) }, 400);
  });
  return app;
}
