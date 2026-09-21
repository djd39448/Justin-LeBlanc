/** Tests stable IMAP high-water paging before message bodies are fetched. */
import { describe, expect, it } from 'vitest';

import {
  createReplySearchQuery,
  planReplyUidPage,
  replyMessageIdNeedle,
} from '../apps/api/adapters/email.js';

describe('IMAP correlated reply paging', () => {
  it('selects only sparse server matches and checkpoints the opening high-water mark', () => {
    expect(
      planReplyUidPage({
        afterUid: 0,
        uidNext: 1465,
        matchingUids: [1460, 1450],
        maximum: 100,
      }),
    ).toEqual({ selectedUids: [1450, 1460], checkpointUid: 1464, hasMore: false });
  });

  it('pages matching UIDs in ascending order without skipping the remainder', () => {
    const matchingUids = [450, 120, 300, 120, 499, 500, 99];
    const first = planReplyUidPage({
      afterUid: 100,
      uidNext: 500,
      matchingUids,
      maximum: 2,
    });
    expect(first).toEqual({ selectedUids: [120, 300], checkpointUid: 300, hasMore: true });

    expect(
      planReplyUidPage({
        afterUid: first.checkpointUid,
        uidNext: 500,
        matchingUids,
        maximum: 2,
      }),
    ).toEqual({ selectedUids: [450, 499], checkpointUid: 499, hasMore: false });
  });

  it('defers arrivals above the mailbox-open high-water mark until the next poll', () => {
    const first = planReplyUidPage({
      afterUid: 1400,
      uidNext: 1465,
      matchingUids: [1464, 1465],
      maximum: 100,
    });
    expect(first).toEqual({ selectedUids: [1464], checkpointUid: 1464, hasMore: false });

    expect(
      planReplyUidPage({
        afterUid: first.checkpointUid,
        uidNext: 1466,
        matchingUids: [1465],
        maximum: 100,
      }),
    ).toEqual({ selectedUids: [1465], checkpointUid: 1465, hasMore: false });
  });

  it('advances past an unmatched mailbox snapshot without selecting bodies', () => {
    expect(
      planReplyUidPage({ afterUid: 100, uidNext: 1465, matchingUids: [], maximum: 100 }),
    ).toEqual({ selectedUids: [], checkpointUid: 1464, hasMore: false });
  });

  it('derives the correlation needle from the public app hostname', () => {
    expect(replyMessageIdNeedle('https://Booking.Example.test:8443/resume')).toBe(
      '@booking.example.test',
    );
    expect(createReplySearchQuery(100, 1464, 'https://booking.example.test')).toEqual({
      uid: '101:1464',
      header: { 'in-reply-to': '@booking.example.test' },
    });
  });
});
