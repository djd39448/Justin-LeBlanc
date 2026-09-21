/**
 * Runs the Houston morning billing scan under a durable lease.
 * Dependencies: Store leases and BillingService. Consumers: scheduler endpoint and CLI.
 * Why: overlapping cron/startup catch-up runs must never enqueue duplicate performer checks.
 */
import { randomUUID } from 'node:crypto';

import { BillingService, type MorningCheckResult } from '../billing/service.js';
import { Store } from '../store.js';

/** Acquires one bounded scheduler lease, runs catch-up, and always releases ownership. */
export async function runMorningJob(
  store: Store,
  service: BillingService,
  input: { workerId?: string; now?: Date; asOfLocalDate?: string; force?: boolean } = {},
): Promise<MorningCheckResult> {
  const owner = input.workerId ?? `morning-${randomUUID()}`;
  if (!store.acquireLease('billing:morning', owner, 10 * 60_000)) {
    throw new Error(
      'Morning billing job is already running; inspect the billing:morning lease before retrying.',
    );
  }
  try {
    return await service.runMorningCheck({
      now: input.now,
      asOfLocalDate: input.asOfLocalDate,
      force: input.force,
    });
  } finally {
    store.releaseLease('billing:morning', owner);
  }
}
