/**
 * Runs one allowlisted SMTP/IMAP diagnostic and writes sanitized evidence.
 *
 * Usage:
 *   node --env-file=C:/private/runtime.env --import tsx scripts/smoke-email.ts
 *
 * Dependencies: server Config and real email adapters.
 * Depended on by: isolated integration acceptance evidence.
 * Why: provider access and Message-ID reconciliation need a reproducible, non-billing live check.
 */
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import {
  ImapEmailAdapter,
  MailEffectSchema,
  SmtpEmailAdapter,
} from '../apps/api/adapters/email.js';
import { loadConfig } from '../apps/api/config.js';

const config = loadConfig();
const messageId = '<jlm-demo-diagnostic-2026-09-21@50by50.dev>';
const imap = new ImapEmailAdapter(config);
const smtp = new SmtpEmailAdapter(config);
const existedBefore = await imap.sentContains(messageId);
let sentNow = false;
if (!existedBefore) {
  const effect = MailEffectSchema.parse({
    version: 1,
    messageId,
    envelopeFrom: config.SMTP_USER,
    to: [config.OPERATOR_EMAIL],
    cc: [],
    bcc: [config.CLIENT_TEST_EMAIL],
    replyTo: config.SMTP_USER,
    subject: '[Justin Demo][DIAGNOSTIC] SMTP and IMAP connectivity check',
    text: 'Justin booking demo diagnostic only. This is not an invoice or payment request. No reply is needed.',
    html: '<div style="font-family:Arial,sans-serif;color:#13233a"><h1>Justin booking demo diagnostic</h1><p>This checks the isolated SMTP and IMAP connection only.</p><p><strong>This is not an invoice or payment request.</strong> No reply is needed.</p></div>',
    headers: { 'X-JLM-Diagnostic': 'email-provider-smoke-v1' },
    attachments: [],
  });
  await smtp.send(effect);
  sentNow = true;
}
const inbox = await imap.readInbox(0, 5);

let reconciled = false;
for (let attempt = 0; attempt < 5 && !reconciled; attempt += 1) {
  reconciled = await imap.sentContains(messageId);
  if (!reconciled) await delay(2_000);
}
if (!reconciled) {
  throw new Error(
    'Diagnostic SMTP call completed but the deterministic Message-ID was not found in Sent; stop before retrying.',
  );
}

const evidence = {
  schemaVersion: 1,
  checkedAt: new Date().toISOString(),
  diagnostic: 'synthetic SMTP/IMAP connectivity; no invoice or payment request',
  smtp: {
    sentNow,
    existedBefore,
    accepted: true,
    recipients: { to: 1, cc: 0, bcc: 1, allAllowlisted: true },
    messageIdSha256: createHash('sha256').update(messageId).digest('hex'),
  },
  imap: {
    inboxConnected: true,
    boundedMaximum: 5,
    inspected: inbox.inspected,
    correlatedRepliesParsed: inbox.messages.length,
    uidValidityObserved: inbox.uidValidity.length > 0,
    sentCopyReconciled: reconciled,
  },
  secretsOrAddressesRecorded: false,
};
const evidencePath = resolve('docs/evidence/email-provider-smoke.json');
await mkdir(dirname(evidencePath), { recursive: true });
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(
  `${JSON.stringify({ ok: true, sentNow, sentCopyReconciled: reconciled, inboxInspected: inbox.inspected, evidence: evidencePath })}\n`,
);
