/**
 * Defines deterministic post-performance reply, amendment, and invoice rules.
 *
 * Dependencies:
 *   - node:crypto: Constant-time nonce checks and immutable snapshot hashes.
 *   - contracts: Canonical customer, quote, and show records.
 *   - Zod: Boundary validation for durable billing records.
 *
 * Depended on by:
 *   - apps/api/billing: Applies these rules inside SQLite transactions.
 *   - packages/documents: Renders validated immutable invoice snapshots.
 *
 * Why this exists:
 *   Email text cannot directly authorize money. This module reduces authenticated replies to a
 *   small grammar and validates every amount before an invoice can be issued.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

import { z } from 'zod';

import {
  CustomerSchema,
  InstantSchema,
  LineItemSchema,
  QuoteSchema,
  ShowSchema,
} from '../contracts/index.js';

const boundedText = z.string().trim().min(1).max(300);

export const AmendmentLineSchema = LineItemSchema.extend({ source: z.literal('performer_reply') });
export type AmendmentLine = z.infer<typeof AmendmentLineSchema>;

export const PerformanceCheckSchema = z.object({
  showId: z.string().min(1),
  calendarEventId: z.string().min(1),
  calendarEtag: z.string().min(1),
  customerId: z.string().min(1),
  quoteId: z.string().min(1),
  quoteVersion: z.number().int().positive(),
  agreedTotalCents: z.number().int().nonnegative(),
  currency: z.literal('USD'),
  authorizedResponder: z.email(),
  replyNonceHash: z.string().length(64),
  outboundMessageId: z.string().min(3),
  reminderMessageId: z.string().min(3).nullable().default(null),
  approvalMessageId: z.string().min(3).nullable().default(null),
  state: z.enum(['pending', 'awaiting_change_approval', 'completed', 'no_invoice', 'needs_review']),
  decision: z.enum(['unknown', 'performed', 'not_performed', 'changed', 'ambiguous']),
  candidateLines: z.array(AmendmentLineSchema).max(10).default([]),
  candidateQuoteVersion: z.number().int().positive().nullable().default(null),
  approvalTokenHash: z.string().length(64).nullable().default(null),
  reminderQueuedAt: InstantSchema.nullable().default(null),
  reminderSentAt: InstantSchema.nullable().default(null),
  repliedAt: InstantSchema.nullable().default(null),
});
export type PerformanceCheck = z.infer<typeof PerformanceCheckSchema>;

export const InvoiceCustomerSnapshotSchema = CustomerSchema.pick({
  name: true,
  email: true,
  company: true,
  billingName: true,
  billingEmail: true,
  billingAddress: true,
  poRequired: true,
  poNumber: true,
});

export const InvoiceSnapshotSchema = z.object({
  customer: InvoiceCustomerSnapshotSchema,
  seller: z.object({
    displayName: boundedText,
    address: z.string().trim().max(800),
    replyEmail: z.email(),
    demoDisclosure: boundedText,
  }),
  event: ShowSchema.pick({
    eventType: true,
    venue: true,
    city: true,
    start: true,
    end: true,
    timezone: true,
  }).extend({ showId: z.string().min(1) }),
  quote: QuoteSchema.pick({
    version: true,
    currency: true,
    lines: true,
    subtotalCents: true,
    taxCents: true,
    depositCents: true,
    totalCents: true,
    policyVersion: true,
  }),
  issuedAt: InstantSchema,
  dueDate: z.iso.date(),
});
export type InvoiceSnapshot = z.infer<typeof InvoiceSnapshotSchema>;

export const InvoiceSchema = z.object({
  showId: z.string().min(1),
  number: z.string().regex(/^JLM-DEMO-\d{4}-\d{4,}$/),
  kind: z.literal('performance'),
  status: z.enum(['approved', 'issuing', 'delivery_pending', 'sent', 'needs_review']),
  snapshot: InvoiceSnapshotSchema,
  snapshotHash: z.string().length(64),
  pdfKey: z.string(),
  contentHash: z.string().length(64).nullable(),
  outboundMessageId: z.string().min(3),
  providerMessageId: z.string().nullable(),
  sentAt: InstantSchema.nullable(),
});
export type Invoice = z.infer<typeof InvoiceSchema>;

export type ReplyCommand =
  | { kind: 'performed' }
  | { kind: 'not_performed' }
  | { kind: 'changed'; lines: AmendmentLine[] }
  | { kind: 'approve'; version: number; token: string }
  | { kind: 'ambiguous'; reason: string };

/** Hashes an unpersisted correlation secret before durable storage. */
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex');
}

/** Compares a supplied secret with a stored SHA-256 hash without timing leakage. */
export function secretMatches(secret: string, expectedHash: string): boolean {
  const actual = Buffer.from(hashSecret(secret), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Parses only the documented reply grammar after quoted text/signatures are removed.
 *
 * Args: replyText - visible new reply text, bounded by the mail worker.
 * Returns: A deterministic command or an ambiguous result that cannot authorize billing.
 */
export function parsePerformanceReply(replyText: string): ReplyCommand {
  const lines = replyText
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const first = lines[0]?.toUpperCase();
  if (lines.length === 1 && first === 'YES') return { kind: 'performed' };
  if (lines.length === 1 && first === 'NO') return { kind: 'not_performed' };

  const approval = lines[0]?.match(/^APPROVE\s+(\d+)\s+([A-Za-z0-9_-]{16,128})$/i);
  if (approval) {
    const versionText = approval[1];
    const token = approval[2];
    if (versionText === undefined || token === undefined) {
      return { kind: 'ambiguous', reason: 'Approval syntax could not be read.' };
    }
    return { kind: 'approve', version: Number.parseInt(versionText, 10), token };
  }

  if (first !== 'YES' || lines.length < 2) {
    return { kind: 'ambiguous', reason: 'Reply must be YES, NO, or the exact approval command.' };
  }
  const changes: AmendmentLine[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length !== 4 || parts[0]?.toUpperCase() !== 'ADD') {
      return {
        kind: 'ambiguous',
        reason: 'Changes must use ADD | description | quantity | unit amount.',
      };
    }
    const description = parts[1];
    const quantityText = parts[2];
    const amountText = parts[3];
    if (description === undefined || quantityText === undefined || amountText === undefined) {
      return { kind: 'ambiguous', reason: 'A change line is incomplete.' };
    }
    const quantity = Number(quantityText);
    const amountMatch = amountText.match(/^\$?(\d{1,7})(?:\.(\d{2}))?$/);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000 || !amountMatch) {
      return { kind: 'ambiguous', reason: 'Change quantity or USD unit amount is invalid.' };
    }
    const whole = amountMatch[1];
    const fraction = amountMatch[2] ?? '00';
    if (whole === undefined) {
      return { kind: 'ambiguous', reason: 'Change amount is invalid.' };
    }
    const unitCents = Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction, 10);
    const parsed = AmendmentLineSchema.safeParse({
      description,
      quantity,
      unitCents,
      source: 'performer_reply',
    });
    if (!parsed.success)
      return { kind: 'ambiguous', reason: 'Change line exceeds allowed limits.' };
    changes.push(parsed.data);
  }
  return changes.length === 0
    ? { kind: 'ambiguous', reason: 'No itemized changes were supplied.' }
    : { kind: 'changed', lines: changes };
}

/** Recalculates and validates a candidate agreed quote without trusting reply-provided totals. */
export function createAmendedQuote(
  original: z.infer<typeof QuoteSchema>,
  additions: AmendmentLine[],
  approvedBy: string,
  approvedAt: string,
): z.infer<typeof QuoteSchema> {
  const quote = QuoteSchema.parse(original);
  const lines = [
    ...quote.lines,
    ...additions.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitCents: line.unitCents,
    })),
  ];
  const subtotalCents = calculateSubtotal(lines);
  const totalCents = subtotalCents + quote.taxCents - quote.depositCents;
  if (totalCents < 0)
    throw new Error('Amended quote total is negative; review the deposit before approval.');
  return QuoteSchema.parse({
    ...quote,
    version: quote.version + 1,
    kind: 'agreed',
    lines,
    subtotalCents,
    totalCents,
    approvedBy,
    approvedAt,
  });
}

/** Validates stored quote arithmetic so a corrupted total never reaches an invoice. */
export function validateAgreedQuote(quoteInput: z.infer<typeof QuoteSchema>): void {
  const quote = QuoteSchema.parse(quoteInput);
  if (quote.kind !== 'agreed' || quote.approvedBy === null || quote.approvedAt === null) {
    throw new Error('Invoice requires an explicitly approved agreed quote; approve a quote first.');
  }
  const subtotal = calculateSubtotal(quote.lines);
  if (subtotal !== quote.subtotalCents) {
    throw new Error(
      'Agreed quote subtotal does not match its line items; review the quote record.',
    );
  }
  if (quote.totalCents !== subtotal + quote.taxCents - quote.depositCents) {
    throw new Error('Agreed quote total is inconsistent; correct it through an audited amendment.');
  }
}

/** Builds the immutable customer, seller, event, and price snapshot used after issue. */
export function buildInvoiceSnapshot(input: {
  showId: string;
  show: z.infer<typeof ShowSchema>;
  customer: z.infer<typeof CustomerSchema>;
  quote: z.infer<typeof QuoteSchema>;
  seller: InvoiceSnapshot['seller'];
  issuedAt: string;
  dueDate: string;
}): InvoiceSnapshot {
  validateAgreedQuote(input.quote);
  if (input.customer.billingName.trim().length === 0) {
    throw new Error('Customer billing name is missing; complete the customer record before issue.');
  }
  if (input.customer.billingEmail.trim().length === 0) {
    throw new Error(
      'Customer billing email is missing; complete the customer record before issue.',
    );
  }
  if (input.customer.billingAddress.trim().length === 0) {
    throw new Error(
      'Customer billing address is missing; complete the customer record before issue.',
    );
  }
  if (input.customer.poRequired && input.customer.poNumber.trim().length === 0) {
    throw new Error('Customer requires a PO number; record it before invoice issue.');
  }
  return InvoiceSnapshotSchema.parse({
    customer: input.customer,
    seller: input.seller,
    event: { ...input.show, showId: input.showId },
    quote: input.quote,
    issuedAt: input.issuedAt,
    dueDate: input.dueDate,
  });
}

/** Creates a stable SHA-256 checksum of an immutable invoice snapshot. */
export function invoiceSnapshotHash(snapshot: InvoiceSnapshot): string {
  return createHash('sha256')
    .update(JSON.stringify(InvoiceSnapshotSchema.parse(snapshot)))
    .digest('hex');
}

function calculateSubtotal(lines: z.infer<typeof LineItemSchema>[]): number {
  let subtotal = 0;
  for (const line of lines) {
    const amount = line.quantity * line.unitCents;
    if (!Number.isSafeInteger(amount))
      throw new Error('Quote line amount exceeds safe integer range.');
    subtotal += amount;
  }
  if (!Number.isSafeInteger(subtotal))
    throw new Error('Quote subtotal exceeds safe integer range.');
  return subtotal;
}
