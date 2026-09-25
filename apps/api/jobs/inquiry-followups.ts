import { randomUUID } from 'node:crypto';

import { InquirySchema } from '../../../packages/contracts/index.js';
import { buildInquiryMail, inquiryEffectId, type InquiryNotificationOptions } from '../inquiry-notifications.js';
import type { Config } from '../config.js';
import { Store } from '../store.js';

const HOUR = 60 * 60_000;

export interface InquiryFollowupResult {
  inspected: number;
  initialized: number;
  dueSoon: number;
  overdue: number;
  skipped: number;
}

export async function runInquiryFollowups(store: Store, config: Config, now = new Date()): Promise<InquiryFollowupResult> {
  const owner = `inquiry-followups-${randomUUID()}`;
  if (!store.acquireLease('inquiry:followups', owner, 10 * 60_000, now.getTime()))
    throw new Error('Inquiry follow-up job is already running; inspect the inquiry:followups lease before retrying.');
  const result: InquiryFollowupResult = { inspected: 0, initialized: 0, dueSoon: 0, overdue: 0, skipped: 0 };
  const options: InquiryNotificationOptions = {
    enabled: config.INQUIRY_NOTIFICATIONS_ENABLED && config.INQUIRY_NOTIFICATION_EMAIL.length > 0,
    recipient: config.INQUIRY_NOTIFICATION_EMAIL,
    sender: config.SMTP_USER || config.OPERATOR_EMAIL,
    replyTo: config.OPERATOR_EMAIL,
    hostname: new URL(config.PUBLIC_SITE_URL).hostname,
  };
  try {
    for (const entity of store.all('inquiries', InquirySchema)) {
      result.inspected += 1;
      const outcome = store.transaction(() => {
        const inquiry = store.get('inquiries', entity.id, InquirySchema);
        if (inquiry.data.followUp === undefined) return { initialized: false, dueSoon: false, overdue: false, skipped: true };
        const prior = inquiry.data.followUp;
        /* Historical inquiries without followUp are intentionally unenrolled. */
        /* The marker is set only in the same transaction as the initial effect. */
        const initialAlert = options.enabled && prior.initialAlertQueuedAt === null;
        let followUp = prior;
        const initialized = false;
        if (followUp.followedUpAt !== null) {
          return { initialized, dueSoon: false, overdue: false, skipped: true };
        }
        const age = now.getTime() - Date.parse(followUp.receivedAt);
        const dueSoon = age >= 20 * HOUR && followUp.reminder20QueuedAt === null;
        const overdue = age >= 24 * HOUR && followUp.overdue24QueuedAt === null;
        if (dueSoon) followUp = { ...followUp, reminder20QueuedAt: now.toISOString() };
        if (overdue) followUp = { ...followUp, overdue24QueuedAt: now.toISOString() };
        if (initialAlert) followUp = { ...followUp, initialAlertQueuedAt: now.toISOString() };
        if (initialAlert || dueSoon || overdue) {
          store.update('inquiries', inquiry.id, inquiry.revision, { ...inquiry.data, followUp });
          if (options.enabled) {
            if (initialAlert) store.enqueue(inquiryEffectId(inquiry.id, 'received'), 'email.inquiry_received', inquiry.id, buildInquiryMail({ inquiryId: inquiry.id, intake: inquiry.data.input, receivedAt: followUp.receivedAt, dueAt: followUp.dueAt, kind: 'received', options }));
            if (dueSoon) store.enqueue(inquiryEffectId(inquiry.id, 'due_soon'), 'email.inquiry_due_soon', inquiry.id, buildInquiryMail({ inquiryId: inquiry.id, intake: inquiry.data.input, receivedAt: followUp.receivedAt, dueAt: followUp.dueAt, kind: 'due_soon', options }));
            if (overdue) store.enqueue(inquiryEffectId(inquiry.id, 'overdue'), 'email.inquiry_overdue', inquiry.id, buildInquiryMail({ inquiryId: inquiry.id, intake: inquiry.data.input, receivedAt: followUp.receivedAt, dueAt: followUp.dueAt, kind: 'overdue', options }));
          }
        }
        return { initialized, dueSoon, overdue, skipped: false };
      });
      if (outcome.initialized) result.initialized += 1;
      if (outcome.dueSoon) result.dueSoon += 1;
      if (outcome.overdue) result.overdue += 1;
      if (outcome.skipped) result.skipped += 1;
    }
    return result;
  } finally {
    store.releaseLease('inquiry:followups', owner);
  }
}

export function markInquiryFollowedUp(store: Store, inquiryId: string, revision: number, actor = 'operator'): unknown {
  return store.transaction(() => {
    const inquiry = store.get('inquiries', inquiryId, InquirySchema);
    if (inquiry.data.followUp === undefined) throw new Error('Historical inquiry has no round-three follow-up state; migrate it explicitly before marking complete.');
    const updated = store.update('inquiries', inquiryId, revision, { ...inquiry.data, followUp: { ...inquiry.data.followUp, followedUpAt: new Date().toISOString() } });
    store.audit(actor, 'inquiry.followed_up', inquiryId, { revision: updated.revision });
    return updated;
  });
}
