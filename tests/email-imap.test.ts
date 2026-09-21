/** Tests durable IMAP UIDVALIDITY reset and cursor progression with real SQLite. */
import { describe, expect, it } from 'vitest';

import { type MailboxPage, type ReceivedMail } from '../apps/api/adapters/email.js';
import { runImapReplyJob, type ReplyMailbox, type ReplyProcessor } from '../apps/api/jobs/imap.js';
import { Store } from '../apps/api/store.js';

describe('IMAP reply cursor', () => {
  it('resets to UID zero on UIDVALIDITY change without skipping the replacement mailbox', async () => {
    const store = new Store(':memory:');
    try {
      const calls: number[] = [];
      const pages: MailboxPage[] = [
        page('10', 50, 2, [mail(50, '10')]),
        page('11', 50, 0, []),
        page('11', 3, 3, [mail(3, '11')]),
      ];
      const mailbox: ReplyMailbox = {
        readInbox: async (afterUid) => {
          calls.push(afterUid);
          const next = pages.shift();
          if (next === undefined) throw new Error('Unexpected mailbox read.');
          return next;
        },
      };
      const processed: string[] = [];
      const processor: ReplyProcessor = {
        processReply: async (message) => {
          processed.push(`${message.uidValidity}:${message.uid}`);
        },
      };
      expect(
        (await runImapReplyJob(store, mailbox, processor, { workerId: 'first' })).lastUid,
      ).toBe(50);
      const changed = await runImapReplyJob(store, mailbox, processor, { workerId: 'second' });
      expect(calls).toEqual([0, 50, 0]);
      expect(changed).toMatchObject({ uidValidity: '11', previousUid: 0, lastUid: 3, fetched: 3 });
      expect(processed).toEqual(['10:50', '11:3']);
    } finally {
      store.close();
    }
  });
});

function page(
  uidValidity: string,
  highestUid: number,
  inspected: number,
  messages: ReceivedMail[],
): MailboxPage {
  return { uidValidity, highestUid, inspected, messages };
}

function mail(uid: number, uidValidity: string): ReceivedMail {
  return {
    mailbox: 'INBOX',
    uidValidity,
    uid,
    messageId: `<message-${uid}@example.test>`,
    inReplyTo: '<check@example.test>',
    from: 'operator@example.test',
    subject: 'YES',
    text: 'YES',
    authenticationResults:
      'mx.google.com; dmarc=pass header.from=example.test; dkim=pass header.i=@example.test',
    autoSubmitted: '',
    precedence: '',
    returnPath: '<operator@example.test>',
    receivedAt: '2026-09-21T12:00:00.000Z',
  };
}
