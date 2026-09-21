/**
 * Renders sanitized brief, ordinary invoice, and long-invoice PDF fixtures.
 *
 * Usage:
 *   npx tsx scripts/render-documents.ts
 *   npx tsx scripts/render-documents.ts --json
 *
 * Dependencies: Shared document templates and Playwright PDF renderer.
 * Depended on by: A12/A21 visual QA and CI/manual acceptance evidence.
 * Why: PDF layout requires repeatable synthetic edge cases, never private customer data.
 */
import { resolve } from 'node:path';

import {
  renderEventBrief,
  renderHtmlPdf,
  renderInvoice,
  type EventBrief,
} from '../packages/documents/index.js';
import { InvoiceSchema, invoiceSnapshotHash } from '../packages/domain/billing.js';

const outputDirectory = resolve('output/pdf');
const brief = renderEventBrief(briefFixture());
const ordinary = renderInvoice(invoiceFixture(false));
const long = renderInvoice(invoiceFixture(true));
const outputs = await Promise.all([
  renderHtmlPdf(brief.html, resolve(outputDirectory, 'synthetic-event-brief.pdf')),
  renderHtmlPdf(ordinary.html, resolve(outputDirectory, 'synthetic-invoice.pdf')),
  renderHtmlPdf(long.html, resolve(outputDirectory, 'synthetic-invoice-long-edge.pdf')),
]);

const result = outputs.map((output) => ({
  path: output.path,
  pagesEstimated: output.pagesEstimated,
}));
if (process.argv.includes('--json'))
  process.stdout.write(`${JSON.stringify({ outputs: result })}\n`);
else {
  for (const output of result)
    process.stdout.write(`Rendered ${output.path} (${output.pagesEstimated} estimated page(s))\n`);
}

function briefFixture(): EventBrief {
  return {
    showId: 'JLM-SYNTHETIC-001',
    revision: 4,
    status: 'Confirmed demo',
    eventType: 'Extended celebration',
    eventDate: 'Saturday, September 19, 2026',
    performanceTime: '7:00 PM-10:00 PM',
    timezone: 'America/Chicago',
    venue: 'The Very Long Synthetic Garden Pavilion and Reception Hall',
    city: 'Houston',
    guestCount: '180',
    priceLabel: 'Agreed',
    price: '$1,175.00 USD',
    client: [
      { label: 'Host', value: 'Synthetic Client' },
      { label: 'Company', value: 'Extraordinarily Long Demonstration Company Name LLC' },
      { label: 'Email', value: 'client@example.test' },
      { label: 'On-site contact', value: 'To confirm' },
    ],
    schedule: [
      { label: 'Consultation', value: 'Completed September 1 at 10:00 AM EDT' },
      { label: 'Load-in', value: '5:30 PM' },
      { label: 'Soundcheck', value: '6:15 PM' },
      { label: 'Performance', value: '7:00 PM-10:00 PM with one planned break' },
      { label: 'Hard curfew', value: '10:30 PM' },
    ],
    music: [
      {
        label: 'Atmosphere',
        value: 'Warm, conversational reception moving into an upbeat celebration',
      },
      { label: 'Requests', value: 'Final priority list to confirm during planning follow-up' },
      { label: 'MC', value: 'To confirm' },
    ],
    venueDetails: [
      { label: 'Address', value: '100 Synthetic Event Way, Houston, TX 77002' },
      { label: 'Setting', value: 'Outdoor pavilion with indoor weather backup' },
      {
        label: 'Power/PA',
        value: 'Dedicated circuit confirmed; house PA compatibility to confirm',
      },
      {
        label: 'Access',
        value: 'Service elevator, 120-foot load-in path, vendor check-in at west gate',
      },
      { label: 'Parking', value: 'One vendor space held near service entrance' },
    ],
    commercial: [
      { label: 'Quote', value: 'Agreed demo quote v2' },
      { label: 'Base performance', value: '$1,000.00 USD' },
      { label: 'Overtime amendment', value: '$175.00 USD for 30 minutes, explicitly approved' },
      { label: 'Deposit', value: '$200.00 USD tracked for demonstration' },
      { label: 'Billing/PO', value: 'Synthetic Client LLC / PO not required' },
    ],
    questions: ['Confirm on-site contact mobile number', 'Confirm final PA input compatibility'],
    lastUpdated: 'September 21, 2026 at 8:00 AM CDT',
    nextAction: 'Operator confirms final production details',
    operatorUrl: 'https://justinleblancmusic.50by50.dev/admin?show=JLM-SYNTHETIC-001',
  };
}

function invoiceFixture(long: boolean) {
  const lines = long
    ? Array.from({ length: 18 }, (_, index) => ({
        description: `Approved synthetic service item ${String(index + 1).padStart(2, '0')} with a deliberately descriptive label for wrapping verification`,
        quantity: index % 3 === 0 ? 2 : 1,
        unitCents: 5_000 + index * 250,
      }))
    : [
        { description: 'Extended celebration performance', quantity: 1, unitCents: 100_000 },
        { description: 'Approved 30-minute overtime amendment', quantity: 1, unitCents: 17_500 },
      ];
  const subtotalCents = lines.reduce((total, line) => total + line.quantity * line.unitCents, 0);
  const snapshot = {
    customer: {
      name: 'Synthetic Client',
      email: 'client@example.test',
      company: 'Extraordinarily Long Demonstration Company Name LLC',
      billingName: 'Extraordinarily Long Demonstration Company Name LLC',
      billingEmail: 'billing@example.test',
      billingAddress: '100 Synthetic Billing Boulevard, Suite 2400\nHouston, TX 77002',
      poRequired: true,
      poNumber: 'PO-SYNTHETIC-2026-0919',
    },
    seller: {
      displayName: 'Justin LeBlanc (Demo)',
      address: 'Seller legal address to confirm before launch',
      replyEmail: 'booking@example.test',
      demoDisclosure: 'Demo invoice using provisional identity and terms. Not a payment request.',
    },
    event: {
      showId: long ? 'JLM-SYNTHETIC-LONG' : 'JLM-SYNTHETIC-001',
      eventType: 'Extended celebration',
      venue: 'The Very Long Synthetic Garden Pavilion and Reception Hall',
      city: 'Houston',
      start: '2026-09-20T00:00:00.000Z',
      end: '2026-09-20T03:30:00.000Z',
      timezone: 'America/Chicago',
    },
    quote: {
      version: 2,
      currency: 'USD' as const,
      lines,
      subtotalCents,
      taxCents: 0 as const,
      depositCents: 20_000,
      totalCents: subtotalCents - 20_000,
      policyVersion: 'demo-2026-09-21.1',
    },
    issuedAt: '2026-09-21T13:00:00.000Z',
    dueDate: '2026-10-05',
  };
  return InvoiceSchema.parse({
    showId: snapshot.event.showId,
    number: long ? 'JLM-DEMO-2026-0002' : 'JLM-DEMO-2026-0001',
    kind: 'performance',
    status: 'approved',
    snapshot,
    snapshotHash: invoiceSnapshotHash(snapshot),
    pdfKey: '',
    contentHash: null,
    outboundMessageId: long ? '<invoice.long@example.test>' : '<invoice.ordinary@example.test>',
    providerMessageId: null,
    sentAt: null,
  });
}
