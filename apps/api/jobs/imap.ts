/**
 * Polls an isolated IMAP Inbox using durable UIDVALIDITY/UID state and a worker lease.
 *
 * Dependencies: ImapEmailAdapter, BillingService, Store, and Zod.
 * Depended on by: two-minute scheduler and operator reply-reconcile command.
 * Why: actual replies must survive restarts without colliding with the existing TrustCore watcher.
 */
import { randomUUID } from 'node:crypto';

import { z } from 'zod';

import { ImapEmailAdapter } from '../adapters/email.js';
import { BillingService } from '../billing/service.js';
import { Store } from '../store.js';

const CursorSchema = z.object({
  kind: z.literal('imap_cursor'),
  mailbox: z.literal('INBOX'),
  uidValidity: z.string().regex(/^\d+$/),
  lastUid: z.number().int().nonnegative(),
  updatedAt: z.iso.datetime({ offset: true }),
});
const CURSOR_ID = 'imap:performance-replies';

export interface ImapJobResult {
  uidValidity: string;
  previousUid: number;
  lastUid: number;
  fetched: number;
  processed: number;
}

/** Polls, processes in ascending UID order, then checkpoints the highest observed UID. */
export async function runImapReplyJob(
  store: Store,
  mailbox: ImapEmailAdapter,
  service: BillingService,
  input: { workerId?: string; maximum?: number } = {},
): Promise<ImapJobResult> {
  const owner = input.workerId ?? `imap-${randomUUID()}`;
  if (!store.acquireLease('billing:imap', owner, 90_000)) {
    throw new Error(
      'IMAP billing worker is already running; inspect the billing:imap lease before retrying.',
    );
  }
  try {
    const previous = store.find('job_runs', CURSOR_ID, CursorSchema);
    const firstPage = await mailbox.readInbox(previous?.data.lastUid ?? 0, input.maximum ?? 100);
    const validityChanged =
      previous !== undefined && previous.data.uidValidity !== firstPage.uidValidity;
    const page = validityChanged ? await mailbox.readInbox(0, input.maximum ?? 100) : firstPage;
    const previousUid = validityChanged ? 0 : (previous?.data.lastUid ?? 0);
    let processed = 0;
    const ordered = [...page.messages].sort((left, right) => left.uid - right.uid);
    for (const message of ordered) {
      await service.processReply(message);
      processed += 1;
    }
    store.transaction(() => {
      const state = CursorSchema.parse({
        kind: 'imap_cursor',
        mailbox: 'INBOX',
        uidValidity: page.uidValidity,
        lastUid: page.highestUid,
        updatedAt: new Date().toISOString(),
      });
      const fresh = store.find('job_runs', CURSOR_ID, CursorSchema);
      if (fresh === undefined) store.insert('job_runs', CURSOR_ID, state);
      else store.update('job_runs', CURSOR_ID, fresh.revision, state);
      if (validityChanged) {
        store.audit('imap-worker', 'imap.uidvalidity_changed', CURSOR_ID, {
          previous: previous?.data.uidValidity,
          current: page.uidValidity,
        });
      }
    });
    return {
      uidValidity: page.uidValidity,
      previousUid,
      lastUid: page.highestUid,
      fetched: page.messages.length,
      processed,
    };
  } finally {
    store.releaseLease('billing:imap', owner);
  }
}
