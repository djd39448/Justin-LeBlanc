import { createHash } from 'node:crypto';

import { MailEffectSchema, type MailEffect } from './adapters/email.js';
import type { InquiryInput } from '../../packages/contracts/index.js';

export interface InquiryNotificationOptions {
  enabled: boolean;
  recipient: string;
  sender: string;
  replyTo: string;
  hostname: string;
}

export type InquiryNotificationKind = 'received' | 'due_soon' | 'overdue';

export function inquiryEffectId(inquiryId: string, kind: InquiryNotificationKind): string {
  return `email:inquiry:${inquiryId}:${kind}`;
}

export function inquiryMessageId(hostname: string, inquiryId: string, kind: InquiryNotificationKind): string {
  return `<inquiry-${kind}.${safeId(inquiryId)}@${hostname}>`;
}

export function buildInquiryMail(input: {
  inquiryId: string;
  intake: InquiryInput;
  receivedAt: string;
  dueAt: string;
  kind: InquiryNotificationKind;
  options: InquiryNotificationOptions;
}): MailEffect {
  const { intake, kind, options } = input;
  const title = kind === 'received' ? 'New booking inquiry' : kind === 'due_soon' ? 'Inquiry follow-up due soon' : 'Inquiry follow-up overdue';
  const fallback = (intake.preferredReply === 'text' || intake.preferredReply === 'phone') && intake.phone === ''
    ? '\nEmail fallback: no phone number was provided, so email is the practical reply path.\n'
    : '';
  const lines = [
    title,
    '',
    `Inquiry reference: ${input.inquiryId}`,
    `Submitted: ${input.receivedAt}`,
    `Follow-up deadline: ${input.dueAt}`,
    '',
    `Your Name: ${intake.name}`,
    `Email: ${intake.email}`,
    `Phone: ${intake.phone || '(none entered)'}`,
    `Preferred response: ${intake.preferredReply}`,
    fallback.trim(),
    `Event type: ${intake.eventType}`,
    `Event date: ${intake.date}`,
    `Location: ${intake.city}`,
    `Outdoors: ${intake.setting}`,
    `Approximate performance time: ${intake.durationMinutes} minutes`,
    `Equipment: ${intake.equipment}`,
    `Estimated budget: ${intake.budgetCents === null ? intake.budget || '(none)' : `$${(intake.budgetCents / 100).toFixed(2)}`}`,
    `Special requests: ${intake.musicRequests || '(none)'}`,
  ].filter(Boolean).join('\n');
  const html = `<div style="font-family:Arial,sans-serif;color:#13233a;line-height:1.45"><h1>${escapeHtml(title)}</h1><dl>${lines.split('\n').slice(2).filter(Boolean).map((line) => {
    const separator = line.indexOf(': ');
    return separator < 0 ? `<p>${escapeHtml(line)}</p>` : `<dt>${escapeHtml(line.slice(0, separator))}</dt><dd>${escapeHtml(line.slice(separator + 2))}</dd>`;
  }).join('')}</dl></div>`;
  return MailEffectSchema.parse({
    version: 1,
    recipientPolicy: 'inquiry_notification',
    messageId: inquiryMessageId(options.hostname, input.inquiryId, kind),
    envelopeFrom: options.sender,
    to: [options.recipient],
    cc: [],
    bcc: [],
    replyTo: options.replyTo,
    subject: `[JLM Inquiry] ${title}`,
    text: lines,
    html,
    headers: { 'X-JLM-Inquiry-ID': input.inquiryId, 'X-JLM-Inquiry-Notification': kind },
    attachments: [],
  });
}

export function idempotencyHash(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeId(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
}

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
