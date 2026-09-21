/** Provides private state, documents and action endpoints.
 * Dependencies: Hono, typed records/documents, runtime and operator gate.
 * Consumers: operator dashboard and CLI. Why: no private data or prices are public tool capabilities. */
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import type { Hono } from 'hono';
import { z } from 'zod';

import {
  ConsultationSchema,
  CustomerSchema,
  InquirySchema,
  QuoteSchema,
  ShowSchema,
} from '../../packages/contracts/index.js';
import { renderInvoice } from '../../packages/documents/index.js';
import { InvoiceSchema, PerformanceCheckSchema } from '../../packages/domain/billing.js';

import { operatorAction } from './operator-actions.js';
import type { Runtime } from './runtime.js';
import { requireToken } from './security.js';

/** Mounts only bearer-protected operator routes; no token is accepted in a URL. */
export function mountOperatorRoutes(app: Hono, runtime: Runtime): void {
  app.use('/api/admin/*', requireToken(runtime.config.ADMIN_TOKEN));
  app.get('/api/admin/state', (c) =>
    c.json({
      inquiries: runtime.store
        .all('inquiries', InquirySchema)
        .map((v) => ({ ...v, data: { ...v.data, tokenHash: undefined } })),
      customers: runtime.store.all('customers', CustomerSchema),
      shows: runtime.store.all('shows', ShowSchema),
      consultations: runtime.store.all('consultations', ConsultationSchema),
      quotes: runtime.store.all('quotes', QuoteSchema),
      invoices: runtime.store.all('invoices', InvoiceSchema),
      checks: runtime.store.all('performance_checks', PerformanceCheckSchema),
      audit: runtime.store.all('audit_events', z.record(z.string(), z.unknown())).slice(-100),
      outbox: runtime.store.effects().map((e) => ({
        id: e.id,
        kind: e.kind,
        entityId: e.entity_id,
        status: e.status,
        error: e.error,
      })),
    }),
  );
  app.post('/api/admin/action', async (c) =>
    c.json({ result: await operatorAction(runtime, await c.req.json()) }),
  );
  app.get('/api/admin/shows/:id/brief/html', async (c) =>
    c.html((await runtime.briefs.preview(c.req.param('id'))).html),
  );
  app.get('/api/admin/shows/:id/brief/pdf', async (c) => {
    const brief = await runtime.briefs.preview(c.req.param('id'), { renderPdf: true });
    if (!brief.pdfPath) throw new Error('Brief PDF was not generated; inspect the renderer.');
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', 'attachment; filename="event-brief.pdf"');
    return c.body(new Uint8Array(await readFile(brief.pdfPath)));
  });
  app.get('/api/admin/invoices/:id/html', (c) =>
    c.html(
      renderInvoice(runtime.store.get('invoices', c.req.param('id'), InvoiceSchema).data).html,
    ),
  );
  app.get('/api/admin/invoices/:id/pdf', async (c) => {
    const invoice = runtime.store.get('invoices', c.req.param('id'), InvoiceSchema);
    const root = resolve(runtime.config.PRIVATE_STORAGE_PATH);
    const path = resolve(root, invoice.data.pdfKey);
    if (!path.startsWith(root + sep))
      throw new Error('Invalid private document path; inspect invoice storage.');
    c.header('Content-Type', 'application/pdf');
    c.header('Content-Disposition', `attachment; filename="${invoice.data.number}.pdf"`);
    return c.body(new Uint8Array(await readFile(path)));
  });
}
