/** Tests inbound mail authority checks and quote stripping. Dependencies: Vitest/email adapter. */
import { describe, expect, it } from 'vitest';

import {
  isAuthenticatedOperatorMail,
  MailEffectSchema,
  type ReceivedMail,
  visibleReplyText,
} from '../apps/api/adapters/email.js';

describe('email boundaries', () => {
  it('requires exact sender and authentication evidence', () => {
    const mail: ReceivedMail = {
      mailbox: 'INBOX',
      uidValidity: '1',
      uid: 1,
      messageId: '<reply@example.test>',
      inReplyTo: '<check@example.test>',
      from: 'operator@example.test',
      subject: 'YES',
      text: 'YES',
      authenticationResults:
        'mx.google.com; spf=pass; dkim=pass header.i=@example.test; dmarc=pass header.from=example.test',
      autoSubmitted: '',
      precedence: '',
      returnPath: '<operator@example.test>',
      receivedAt: '2026-09-21T12:00:00.000Z',
    };
    expect(isAuthenticatedOperatorMail(mail, 'operator@example.test')).toBe(true);
    expect(
      isAuthenticatedOperatorMail(
        { ...mail, from: 'attacker@example.test' },
        'operator@example.test',
      ),
    ).toBe(false);
    expect(
      isAuthenticatedOperatorMail(
        {
          ...mail,
          authenticationResults: 'mx.google.com; spf=pass; dmarc=fail header.from=example.test',
        },
        'operator@example.test',
      ),
    ).toBe(false);
    expect(
      isAuthenticatedOperatorMail(
        { ...mail, autoSubmitted: 'auto-replied' },
        'operator@example.test',
      ),
    ).toBe(false);
    expect(
      isAuthenticatedOperatorMail(
        {
          ...mail,
          authenticationResults:
            'attacker.example; dmarc=pass header.from=example.test; mx.google.com; dmarc=pass header.from=example.test',
        },
        'operator@example.test',
      ),
    ).toBe(false);
    expect(
      isAuthenticatedOperatorMail(
        {
          ...mail,
          authenticationResults: 'mx.google.com; dmarc=pass header.from=attacker.example',
        },
        'operator@example.test',
      ),
    ).toBe(false);
  });

  it('removes quoted text and signatures before reply grammar sees them', () => {
    expect(visibleReplyText('YES\n\nOn Sunday, sender wrote:\n> NO')).toBe('YES');
    expect(visibleReplyText('NO\n--\nSent from phone')).toBe('NO');
  });

  it('keeps To and BCC explicit in the durable effect contract', () => {
    const effect = MailEffectSchema.parse({
      version: 1,
      messageId: '<invoice@example.test>',
      envelopeFrom: 'sender@example.test',
      to: ['client@example.test'],
      cc: [],
      bcc: ['operator@example.test'],
      replyTo: 'sender@example.test',
      subject: 'Invoice',
      text: 'Demo invoice',
      html: '<p>Demo invoice</p>',
      headers: {},
      attachments: [],
    });
    expect(effect.to).toEqual(['client@example.test']);
    expect(effect.bcc).toEqual(['operator@example.test']);
  });
});
