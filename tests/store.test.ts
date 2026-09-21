/** Exercises real SQLite transactions and revisions. Dependencies: Store/Zod/Vitest.
 * Consumers: CI. Why: concurrency and durable effects cannot be proved with mocked persistence. */
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Store } from '../apps/api/store.js';

describe('durable record boundaries', () => {
  it('rolls back records and effects together after a failed transition', () => {
    const store = new Store(':memory:');
    expect(() =>
      store.transaction(() => {
        store.insert('customers', 'one', { name: 'Synthetic' });
        store.enqueue('mail-one', 'mail', 'one', {});
        throw new Error('invalid quote');
      }),
    ).toThrow('invalid quote');
    expect(store.all('customers', z.unknown())).toHaveLength(0);
    expect(store.effects()).toHaveLength(0);
    store.close();
  });
  it('rejects stale revisions and duplicate effect claims', () => {
    const store = new Store(':memory:');
    store.insert('customers', 'one', { name: 'Synthetic' });
    store.update('customers', 'one', 1, { name: 'Changed' });
    expect(() => store.update('customers', 'one', 1, { name: 'Lost update' })).toThrow(
      'Revision conflict',
    );
    store.enqueue('mail', 'mail', 'one', {});
    store.enqueue('mail', 'mail', 'one', {});
    expect(store.effects()).toHaveLength(1);
    expect(store.claimEffect('mail')).toBe(true);
    expect(store.claimEffect('mail')).toBe(false);
    store.close();
  });
  it('bounds job ownership to a durable lease', () => {
    const store = new Store(':memory:');
    expect(store.acquireLease('morning', 'worker-a', 1000, 0)).toBe(true);
    expect(store.acquireLease('morning', 'worker-b', 1000, 1)).toBe(false);
    store.releaseLease('morning', 'worker-b');
    expect(store.acquireLease('morning', 'worker-b', 1000, 1001)).toBe(true);
    store.close();
  });
});
