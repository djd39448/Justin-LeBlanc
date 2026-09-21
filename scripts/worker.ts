/** Runs a dedicated durable scheduler process, independent of the HTTP server.
 * Dependencies: runtime, morning and IMAP jobs. Consumers: jlm-demo Windows task.
 * Why: Houston civil-time scheduling catches up after outages without relying on host timezone. */
import { setTimeout as delay } from 'node:timers/promises';

import { loadConfig } from '../apps/api/config.js';
import { runImapReplyJob } from '../apps/api/jobs/imap.js';
import { runMorningJob } from '../apps/api/jobs/morning.js';
import { createRuntime } from '../apps/api/runtime.js';

const runtime = createRuntime(loadConfig());
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.once(signal, () => {
    stopping = true;
  });
let lastReplies = 0;
let lastMorning = 0;
/** Isolates a job failure so another independent job still runs; logs omit private payloads. */
async function run(name: string, task: () => Promise<unknown>, quiet = false): Promise<void> {
  try {
    await task();
    if (!quiet)
      process.stdout.write(
        JSON.stringify({ event: 'job_ok', job: name, at: new Date().toISOString() }) + '\n',
      );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'job_failed',
        job: name,
        error: error instanceof Error ? error.name : 'Error',
        remedy: 'Use authenticated operator state and runbook; no automatic uncertain resend.',
      }),
    );
  }
}
try {
  await run('reconcile-interrupted', () => runtime.outbox.recoverInterrupted());
  while (!stopping) {
    const now = new Date();
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        hourCycle: 'h23',
      }).format(now),
    );
    if (
      runtime.config.MORNING_SCAN_ENABLED &&
      hour >= 8 &&
      now.getTime() - lastMorning >= 15 * 60_000
    ) {
      lastMorning = now.getTime();
      await run('morning', () => runMorningJob(runtime.store, runtime.billing, { now }));
    }
    if (runtime.config.INVOICE_SEND_ENABLED && now.getTime() - lastReplies >= 120_000) {
      lastReplies = now.getTime();
      await run('imap', () => runImapReplyJob(runtime.store, runtime.imap, runtime.billing));
      await run('billing-followups', async () => runtime.billing.runFollowups({ now }));
    }
    if (runtime.config.BOOKING_WRITES_ENABLED)
      await run('expire-holds', async () => runtime.booking.expireHolds(), true);
    if (runtime.store.effects('pending').length > 0)
      await run('outbox', () => runtime.outbox.dispatchPending(10), true);
    if (!stopping) await delay(15_000);
  }
} finally {
  runtime.store.close();
}
