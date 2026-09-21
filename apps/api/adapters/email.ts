/**
 * Sends allowlisted SMTP effects and reads correlated replies through a separate IMAP connection.
 *
 * Dependencies:
 *   - config: Applies the final demo recipient boundary.
 *   - ImapFlow/mailparser/nodemailer: Real mailbox and transport adapters.
 *   - Zod: Validates every durable effect and received message boundary.
 *
 * Depended on by:
 *   - outbox dispatcher: Sends or reconciles deterministic Message-IDs.
 *   - IMAP reply job: Fetches new Inbox messages with UID cursor metadata.
 *
 * Why this exists:
 *   SMTP acceptance can be uncertain and an email From header is not authority. This adapter keeps
 *   sending, sent-folder reconciliation, and authenticated inbound evidence explicit.
 */
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer, { type Transporter } from 'nodemailer';
import { z } from 'zod';

import { assertRecipients, type Config } from '../config.js';

const AddressSchema = z.email().transform((value) => value.toLowerCase());
export const MailEffectSchema = z.object({
  version: z.literal(1),
  messageId: z.string().regex(/^<[^<>\s]+>$/),
  envelopeFrom: AddressSchema,
  to: z.array(AddressSchema).min(1).max(3),
  cc: z.array(AddressSchema).max(3).default([]),
  bcc: z.array(AddressSchema).max(3).default([]),
  replyTo: AddressSchema,
  subject: z.string().min(1).max(200),
  text: z.string().min(1).max(100_000),
  html: z.string().min(1).max(250_000),
  headers: z.record(z.string(), z.string()).default({}),
  attachments: z
    .array(
      z.object({
        filename: z
          .string()
          .min(1)
          .max(180)
          .refine((value) => !/[\\/]/.test(value)),
        path: z.string().min(1),
        contentType: z.string().min(1).max(100),
      }),
    )
    .max(3)
    .default([]),
});
export type MailEffect = z.infer<typeof MailEffectSchema>;

export const ReceivedMailSchema = z.object({
  mailbox: z.string().min(1),
  uidValidity: z.string().regex(/^\d+$/),
  uid: z.number().int().positive(),
  messageId: z.string().min(1),
  inReplyTo: z.string().min(1),
  from: AddressSchema,
  subject: z.string().max(500),
  text: z.string().max(100_000),
  authenticationResults: z.string().max(10_000),
  autoSubmitted: z.string().max(200),
  precedence: z.string().max(200),
  returnPath: z.string().max(500),
  receivedAt: z.iso.datetime({ offset: true }),
});
export type ReceivedMail = z.infer<typeof ReceivedMailSchema>;

export interface MailboxPage {
  uidValidity: string;
  highestUid: number;
  inspected: number;
  messages: ReceivedMail[];
}

export class UncertainEmailSendError extends Error {
  readonly messageId: string;

  constructor(messageId: string, causeMessage: string) {
    super(
      `SMTP outcome is uncertain for ${messageId}: ${causeMessage}. Search the Sent mailbox by Message-ID before any retry.`,
    );
    this.name = 'UncertainEmailSendError';
    this.messageId = messageId;
  }
}

/** Real SMTP adapter with recipient enforcement immediately before the network call. */
export class SmtpEmailAdapter {
  private readonly transport: Transporter;

  constructor(private readonly config: Config) {
    this.transport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
    });
  }

  /** Sends one validated effect; a network error becomes uncertain rather than retryable. */
  async send(input: MailEffect): Promise<{ providerMessageId: string }> {
    const effect = MailEffectSchema.parse(input);
    assertRecipients(this.config, [...effect.to, ...effect.cc, ...effect.bcc]);
    try {
      const result = await this.transport.sendMail({
        from: effect.envelopeFrom,
        to: effect.to,
        cc: effect.cc,
        bcc: effect.bcc,
        replyTo: effect.replyTo,
        subject: effect.subject,
        text: effect.text,
        html: effect.html,
        messageId: effect.messageId,
        headers: effect.headers,
        attachments: effect.attachments,
      });
      if (result.messageId !== effect.messageId) {
        throw new UncertainEmailSendError(
          effect.messageId,
          `provider returned mismatched Message-ID ${result.messageId}`,
        );
      }
      return { providerMessageId: result.messageId };
    } catch (error) {
      if (error instanceof UncertainEmailSendError) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new UncertainEmailSendError(effect.messageId, message);
    }
  }
}

/** Opens isolated short-lived IMAP sessions for Inbox polling and Sent reconciliation. */
export class ImapEmailAdapter {
  constructor(private readonly config: Config) {}

  /** Reads bounded messages after a durable UID cursor from Inbox only. */
  async readInbox(afterUid: number, maximum = 100): Promise<MailboxPage> {
    if (!Number.isInteger(afterUid) || afterUid < 0) {
      throw new Error('IMAP cursor must be a nonnegative integer UID.');
    }
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 500) {
      throw new Error('IMAP scan maximum must be an integer from 1 through 500.');
    }
    const client = this.createClient();
    await client.connect();
    try {
      const mailbox = await client.mailboxOpen('INBOX');
      const uidValidity = String(mailbox.uidValidity);
      const messages: ReceivedMail[] = [];
      let highestUid = afterUid;
      let inspected = 0;
      const range = `${Math.max(1, afterUid + 1)}:*`;
      for await (const fetched of client.fetch(range, { uid: true, source: true }, { uid: true })) {
        if (fetched.uid <= afterUid) continue;
        highestUid = Math.max(highestUid, fetched.uid);
        inspected += 1;
        if (fetched.source !== undefined) {
          const parsed = await simpleParser(fetched.source);
          const from = parsed.from?.value.length === 1 ? parsed.from.value[0]?.address : undefined;
          const messageId = parsed.messageId;
          const inReplyTo = Array.isArray(parsed.inReplyTo)
            ? parsed.inReplyTo.length === 1
              ? parsed.inReplyTo[0]
              : undefined
            : parsed.inReplyTo;
          if (from !== undefined && messageId !== undefined && inReplyTo !== undefined) {
            const received = ReceivedMailSchema.safeParse({
              mailbox: 'INBOX',
              uidValidity,
              uid: fetched.uid,
              messageId,
              inReplyTo,
              from,
              subject: parsed.subject ?? '',
              text: parsed.text ?? '',
              authenticationResults: firstRawHeader(parsed.headerLines, 'authentication-results'),
              autoSubmitted: headerText(parsed.headers.get('auto-submitted')),
              precedence: headerText(parsed.headers.get('precedence')),
              returnPath: headerText(parsed.headers.get('return-path')),
              receivedAt: (parsed.date ?? new Date()).toISOString(),
            });
            if (received.success) messages.push(received.data);
          }
        }
        if (inspected >= maximum) break;
      }
      return { uidValidity, highestUid, inspected, messages };
    } finally {
      client.close();
    }
  }

  /** Searches the provider Sent mailbox for an exact deterministic Message-ID. */
  async sentContains(messageId: string): Promise<boolean> {
    if (!/^<[^<>\s]+>$/.test(messageId))
      throw new Error('Sent reconciliation requires a valid Message-ID.');
    const client = this.createClient();
    await client.connect();
    try {
      const sentMailbox = await findSentMailbox(client);
      await client.mailboxOpen(sentMailbox);
      const matches = await client.search({ header: { 'message-id': messageId } }, { uid: true });
      return Array.isArray(matches) && matches.length > 0;
    } finally {
      client.close();
    }
  }

  private createClient(): ImapFlow {
    return new ImapFlow({
      host: this.config.IMAP_HOST,
      port: this.config.IMAP_PORT,
      secure: true,
      auth: { user: this.config.SMTP_USER, pass: this.config.SMTP_PASS },
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      logger: false,
    });
  }
}

/** Requires configured sender identity plus provider authentication evidence. */
export function isAuthenticatedOperatorMail(
  message: ReceivedMail,
  operatorEmail: string,
  trustedAuthservId = 'mx.google.com',
): boolean {
  if (message.mailbox.toUpperCase() !== 'INBOX') return false;
  if (message.from !== operatorEmail.trim().toLowerCase()) return false;
  if (message.autoSubmitted.length > 0 && message.autoSubmitted.toLowerCase() !== 'no')
    return false;
  if (/^(bulk|junk|list)$/i.test(message.precedence)) return false;
  if (message.returnPath.trim() === '<>') return false;
  const authentication = message.authenticationResults.trim().toLowerCase();
  if (!authentication.startsWith(`${trustedAuthservId.toLowerCase()};`)) return false;
  const operatorDomain = operatorEmail.trim().toLowerCase().split('@')[1];
  if (operatorDomain === undefined) return false;
  const escapedDomain = operatorDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (
    /\bdmarc=pass\b/.test(authentication) &&
    new RegExp(`\\bheader\\.from=${escapedDomain}(?:\\s|;|$)`).test(authentication)
  );
}

/** Removes common quoted history and signature blocks before command parsing. */
export function visibleReplyText(text: string): string {
  const bounded = text.slice(0, 100_000).replace(/\r/g, '');
  const lines = bounded.split('\n');
  const visible: string[] = [];
  for (const line of lines) {
    if (
      /^>/.test(line) ||
      /^On .+wrote:$/i.test(line) ||
      /^-{2,}\s*Original Message\s*-{2,}$/i.test(line)
    )
      break;
    if (line.trim() === '--') break;
    visible.push(line);
  }
  return visible.join('\n').trim();
}

function headerText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return value.map((entry) => String(entry)).join('; ');
  if (typeof value === 'object' && 'text' in value) {
    const textValue = (value as { text?: unknown }).text;
    return textValue === undefined ? String(value) : String(textValue);
  }
  return String(value);
}

function firstRawHeader(
  lines: ReadonlyArray<{ key: string; line: string }>,
  expectedKey: string,
): string {
  const header = lines.find((line) => line.key.toLowerCase() === expectedKey.toLowerCase());
  if (header === undefined) return '';
  const separator = header.line.indexOf(':');
  return separator === -1 ? '' : header.line.slice(separator + 1).trim();
}

async function findSentMailbox(client: ImapFlow): Promise<string> {
  const boxes = await client.list();
  const specialUse = boxes.find((box) => box.specialUse === '\\Sent');
  if (specialUse) return specialUse.path;
  const named = boxes.find((box) => /(^|\/)sent( mail)?$/i.test(box.path));
  if (named) return named.path;
  throw new Error(
    'No Sent mailbox was found; configure a mailbox with the \\Sent special-use flag.',
  );
}
