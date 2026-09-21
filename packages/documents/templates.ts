/**
 * Renders shared accessible HTML and plaintext for event briefs and invoices.
 *
 * Dependencies:
 *   - domain/billing: Immutable invoice snapshot schema.
 *   - Zod: Validates bounded event-brief view models.
 *
 * Depended on by:
 *   - billing service: Creates email bodies from the same typed source as PDFs.
 *   - scripts/render-documents: Produces sanitized visual acceptance fixtures.
 *
 * Why this exists:
 *   Keeping email and PDF content in one typed template prevents recipient-facing discrepancies.
 */
import { z } from 'zod';

import { InvoiceSchema, type Invoice } from '../domain/billing.js';

const text = z.string().trim().max(800);
const display = z.union([text.min(1), z.literal('To confirm')]);

export const EventBriefSchema = z.object({
  showId: z.string().min(1),
  revision: z.number().int().positive(),
  status: z.string().min(1).max(40),
  eventType: display,
  eventDate: display,
  performanceTime: display,
  timezone: z.string().min(1),
  venue: display,
  city: display,
  guestCount: display,
  priceLabel: z.enum(['Agreed', 'Estimate']),
  price: display,
  client: z.array(z.object({ label: text.min(1), value: display })).max(8),
  schedule: z.array(z.object({ label: text.min(1), value: display })).max(8),
  music: z.array(z.object({ label: text.min(1), value: display })).max(8),
  venueDetails: z.array(z.object({ label: text.min(1), value: display })).max(8),
  commercial: z.array(z.object({ label: text.min(1), value: display })).max(10),
  questions: z.array(text.min(1)).max(8),
  lastUpdated: z.string().min(1),
  nextAction: display,
  operatorUrl: z.url(),
});
export type EventBrief = z.infer<typeof EventBriefSchema>;

export interface RenderedDocument {
  html: string;
  text: string;
}

const pageCss = `
  :root{color:#13233a;background:#fff;font-family:Arial,Helvetica,sans-serif;font-size:10.25pt}
  *{box-sizing:border-box} body{margin:0;color:#13233a;background:#fff;line-height:1.3}
  .page{max-width:7.5in;margin:0 auto;padding:0.45in}
  .brand{color:#0b4f8a;font-size:12pt;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  h1{font-size:23pt;line-height:1.05;margin:4px 0;color:#092f54} h2{font-size:11pt;color:#0b4f8a;margin:0 0 6px}
  p{margin:3px 0}.muted{color:#526579}.badge,.demo{display:inline-block;padding:4px 8px;border-radius:4px;font-weight:700}
  .badge{background:#e9f3fb;color:#0b4f8a}.demo{background:#fff0c2;color:#6a4300;margin:8px 0}
  .summary{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin:10px 0}
  .summary>div,.section{border:1px solid #d7e0e8;border-radius:6px;padding:7px;background:#fbfcfd}
  .label{font-size:8.5pt;color:#526579;text-transform:uppercase;letter-spacing:.03em}.value{font-weight:700;overflow-wrap:anywhere}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.section{break-inside:avoid}
  dl{display:grid;grid-template-columns:35% 65%;margin:0;gap:3px 6px}dt{color:#526579}dd{margin:0;overflow-wrap:anywhere}
  table{width:100%;border-collapse:collapse;margin:12px 0;break-inside:auto}thead{display:table-header-group}
  th,td{padding:7px 6px;border-bottom:1px solid #d7e0e8;text-align:left;vertical-align:top}th{background:#e9f3fb;color:#092f54}
  .number{text-align:right;white-space:nowrap}.totals{margin-left:auto;width:48%;break-inside:avoid}.amount-due{font-size:14pt;font-weight:700;color:#092f54}
  footer{margin-top:12px;border-top:1px solid #d7e0e8;padding-top:8px;font-size:8.5pt;color:#526579}
  @page{size:Letter;margin:0}@media print{.page{max-width:none;padding:.5in}}@media(max-width:600px){.page{padding:20px}.summary,.grid{grid-template-columns:1fr}.totals{width:100%}}
`;

/** Renders a private operator event brief as print/email HTML plus plaintext. */
export function renderEventBrief(input: EventBrief): RenderedDocument {
  const brief = EventBriefSchema.parse(input);
  const summary = [
    ['Date', brief.eventDate],
    ['Performance', `${brief.performanceTime} ${brief.timezone}`],
    ['Venue', `${brief.venue}, ${brief.city}`],
    ['Event', brief.eventType],
    ['Guests', brief.guestCount],
    [brief.priceLabel, brief.price],
  ] as const;
  const sections = [
    ['Client', brief.client],
    ['Schedule', brief.schedule],
    ['Music', brief.music],
    ['Venue', brief.venueDetails],
    ['Commercial', brief.commercial],
  ] as const;
  const html = documentShell(
    'Justin LeBlanc Event Brief',
    `<div class="brand">Justin LeBlanc</div><h1>Event Brief</h1>
      <p><span class="badge">${escapeHtml(brief.status)}</span> Show ${escapeHtml(brief.showId)} - revision ${brief.revision}</p>
      <div class="summary">${summary.map(([label, value]) => summaryCard(label, value)).join('')}</div>
      <div class="grid">${sections.map(([heading, rows]) => section(heading, rows)).join('')}${brief.questions.length === 0 ? '' : `<div class="section"><h2>Questions to confirm</h2><ul>${brief.questions.map((question) => `<li>${escapeHtml(question)}</li>`).join('')}</ul></div>`}</div>
      <footer>Last updated ${escapeHtml(brief.lastUpdated)}. Next action: ${escapeHtml(brief.nextAction)}.<br>
      Private operator record: <a href="${escapeAttribute(brief.operatorUrl)}">${escapeHtml(brief.operatorUrl)}</a></footer>`,
  );
  const textBody = sections
    .map(
      ([heading, rows]) =>
        `${heading.toUpperCase()}\n${rows.map((row) => `${row.label}: ${row.value}`).join('\n')}`,
    )
    .join('\n\n');
  return {
    html,
    text: `JUSTIN LEBLANC - EVENT BRIEF\n${brief.status} | ${brief.showId} | revision ${brief.revision}\n\n${summary.map(([label, value]) => `${label}: ${value}`).join('\n')}\n\n${textBody}\n\nQuestions: ${brief.questions.join('; ') || 'None'}\nNext action: ${brief.nextAction}\n${brief.operatorUrl}`,
  };
}

/** Renders an immutable invoice into matching accessible HTML and plaintext. */
export function renderInvoice(input: Invoice): RenderedDocument {
  const invoice = InvoiceSchema.parse(input);
  const snapshot = invoice.snapshot;
  const rows = snapshot.quote.lines
    .map((line) => {
      const amount = line.quantity * line.unitCents;
      return `<tr><td>${escapeHtml(line.description)}</td><td class="number">${line.quantity}</td><td class="number">${formatUsd(line.unitCents)}</td><td class="number">${formatUsd(amount)}</td></tr>`;
    })
    .join('');
  const billTo = [
    snapshot.customer.billingName,
    snapshot.customer.company,
    snapshot.customer.billingAddress,
    snapshot.customer.billingEmail,
    snapshot.customer.poNumber.length > 0 ? `PO: ${snapshot.customer.poNumber}` : '',
  ].filter(
    (part, index, values) =>
      part.trim().length > 0 && values.findIndex((candidate) => candidate === part) === index,
  );
  const issuedDate = snapshot.issuedAt.slice(0, 10);
  const totalRows = [
    ['Subtotal', snapshot.quote.subtotalCents],
    ['Tax (demo assumption)', snapshot.quote.taxCents],
    ['Deposit credited', -snapshot.quote.depositCents],
  ] as const;
  const html = documentShell(
    `Invoice ${invoice.number}`,
    `<div class="brand">${escapeHtml(snapshot.seller.displayName)}</div><h1>INVOICE</h1>
      <div class="demo">DEMO - NOT A PAYMENT REQUEST</div>
      <div class="summary">
        ${summaryCard('Invoice number', invoice.number)}${summaryCard('Issued', issuedDate)}${summaryCard('Due', snapshot.dueDate)}
        ${summaryCard('Event date', formatEventDate(snapshot.event.start, snapshot.event.timezone))}
        ${summaryCard('Venue', `${snapshot.event.venue || 'To confirm'}, ${snapshot.event.city}`)}${summaryCard('Currency', snapshot.quote.currency)}
      </div>
      <div class="grid"><div class="section"><h2>Seller</h2><p>${escapeHtml(snapshot.seller.displayName)}</p><p>${multiline(snapshot.seller.address || 'Address to confirm')}</p><p>${escapeHtml(snapshot.seller.replyEmail)}</p></div>
      <div class="section"><h2>Bill to</h2><p>${billTo.map((part) => multiline(part)).join('<br>')}</p></div></div>
      <table aria-label="Invoice items"><thead><tr><th>Description</th><th class="number">Qty</th><th class="number">Rate</th><th class="number">Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <table class="totals" aria-label="Invoice totals"><tbody>${totalRows.map(([label, amount]) => `<tr><th>${label}</th><td class="number">${formatUsd(amount)}</td></tr>`).join('')}<tr class="amount-due"><th>Amount due</th><td class="number">${formatUsd(snapshot.quote.totalCents)}</td></tr></tbody></table>
      <div class="section"><h2>Payment and terms</h2><p>Payment instructions are intentionally omitted in this demo. No payment is requested.</p><p>Questions: reply to ${escapeHtml(snapshot.seller.replyEmail)}. Terms: due 14 calendar days after issue for demonstration only.</p></div>
      <footer>${escapeHtml(snapshot.seller.demoDisclosure)} Invoice snapshot ${escapeHtml(invoice.snapshotHash.slice(0, 12))}. Event reference ${escapeHtml(snapshot.event.showId)}.</footer>`,
  );
  const lineText = snapshot.quote.lines
    .map(
      (line) =>
        `${line.description} | ${line.quantity} x ${formatUsd(line.unitCents)} | ${formatUsd(line.quantity * line.unitCents)}`,
    )
    .join('\n');
  return {
    html,
    text: `INVOICE ${invoice.number}\nDEMO - NOT A PAYMENT REQUEST\nIssued: ${issuedDate}\nDue: ${snapshot.dueDate}\nCurrency: USD\n\nSELLER\n${snapshot.seller.displayName}\n${snapshot.seller.address || 'Address to confirm'}\n${snapshot.seller.replyEmail}\n\nBILL TO\n${billTo.join('\n')}\n\nEVENT\n${snapshot.event.eventType} on ${formatEventDate(snapshot.event.start, snapshot.event.timezone)}\n${snapshot.event.venue || 'To confirm'}, ${snapshot.event.city}\n\nITEMS\n${lineText}\n\nSubtotal: ${formatUsd(snapshot.quote.subtotalCents)}\nTax: ${formatUsd(snapshot.quote.taxCents)}\nDeposit credited: ${formatUsd(snapshot.quote.depositCents)}\nAMOUNT DUE: ${formatUsd(snapshot.quote.totalCents)}\n\nPayment instructions are intentionally omitted in this demo. No payment is requested.\nReply to ${snapshot.seller.replyEmail}.`,
  };
}

function documentShell(title: string, contents: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHtml(title)}</title><style>${pageCss}</style></head><body><main class="page">${contents}</main></body></html>`;
}

function summaryCard(label: string, value: string): string {
  return `<div><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`;
}

function section(heading: string, rows: { label: string; value: string }[]): string {
  return `<section class="section"><h2>${escapeHtml(heading)}</h2><dl>${rows.map((row) => `<dt>${escapeHtml(row.label)}</dt><dd>${escapeHtml(row.value)}</dd>`).join('')}</dl></section>`;
}

function formatUsd(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)} USD`;
}

function formatEventDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(instant));
}

function multiline(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    const replacement = replacements[character];
    if (replacement === undefined) throw new Error('HTML escaping table is incomplete.');
    return replacement;
  });
}
