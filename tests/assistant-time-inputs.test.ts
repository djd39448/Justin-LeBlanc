/** Verifies deterministic timezone handling for assistant availability and scheduling tools. */
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AssistantToolContext } from '../apps/api/assistants/tools.js';
import { ConfigSchema } from '../apps/api/config.js';
import { createRuntime, type Runtime } from '../apps/api/runtime.js';

let runtime: Runtime | undefined;

afterEach(() => {
  runtime?.store.close();
  runtime = undefined;
});

function fixture(): Runtime {
  runtime = createRuntime(
    ConfigSchema.parse({
      NODE_ENV: 'test',
      DATABASE_URL: ':memory:',
      ADMIN_TOKEN: 'a'.repeat(32),
      JOB_AUTH_SECRET: 'j'.repeat(32),
      DEMO_RECIPIENT_ALLOWLIST: 'operator@example.test',
      OPERATOR_EMAIL: 'operator@example.test',
      PERFORMER_EMAIL: 'operator@example.test',
      CLIENT_TEST_EMAIL: 'operator@example.test',
    }),
  );
  return runtime;
}

const voiceContext: AssistantToolContext = {
  channel: 'voice',
  inquiryId: 'inquiry-1',
  resumeToken: 'r'.repeat(32),
};

describe('assistant time inputs', () => {
  it('normalizes Central summer and winter local times while preserving seconds and offsets', async () => {
    const activeRuntime = fixture();
    const availability = vi.spyOn(activeRuntime.booking, 'getAvailability').mockResolvedValue({
      consultationAvailable: true,
      performanceAvailable: true,
      reasons: [],
    });

    await activeRuntime.handlers.getAvailability(
      {
        consultationStart: '2026-07-15T10:30',
        performanceStart: '2026-12-15T19:00:45',
        performanceEnd: '2026-12-15T21:00:00-06:00',
      },
      voiceContext,
    );

    expect(availability).toHaveBeenCalledWith({
      consultationStart: '2026-07-15T15:30:00.000Z',
      performanceStart: '2026-12-16T01:00:45.000Z',
      performanceEnd: '2026-12-15T21:00:00-06:00',
    });
  });

  it('rejects Central DST gaps and overlaps before checking booking availability', async () => {
    const activeRuntime = fixture();
    const availability = vi.spyOn(activeRuntime.booking, 'getAvailability').mockResolvedValue({
      consultationAvailable: true,
      performanceAvailable: true,
      reasons: [],
    });

    for (const consultationStart of ['2026-03-08T02:30', '2026-11-01T01:30']) {
      await expect(
        activeRuntime.handlers.getAvailability(
          {
            consultationStart,
            performanceStart: '2026-12-15T19:00',
            performanceEnd: '2026-12-15T21:00',
          },
          voiceContext,
        ),
      ).rejects.toThrow(/does not exist|ambiguous/);
    }
    expect(availability).not.toHaveBeenCalled();
  });

  it('uses the validated schedule timezone and preserves association and consent fields', async () => {
    const activeRuntime = fixture();
    const schedule = vi
      .spyOn(activeRuntime.booking, 'scheduleConsultationAndHold')
      .mockResolvedValue({
        inquiryId: voiceContext.inquiryId ?? '',
        showId: 'show-1',
        consultationId: 'consultation-1',
        status: 'tentative',
        replayed: false,
      });

    await activeRuntime.handlers.scheduleConsultationAndHold(
      {
        consultationStart: '2026-07-15T10:30:15',
        performanceStart: '2026-12-15T19:00',
        performanceEnd: '2026-12-15T21:00',
        timezone: 'America/Denver',
        reviewConsent: true,
        requestKey: 'schedule-time-test',
      },
      voiceContext,
    );

    expect(schedule).toHaveBeenCalledWith({
      consultationStart: '2026-07-15T16:30:15.000Z',
      performanceStart: '2026-12-16T02:00:00.000Z',
      performanceEnd: '2026-12-16T04:00:00.000Z',
      timezone: 'America/Denver',
      reviewConsent: true,
      requestKey: 'schedule-time-test',
      inquiryId: 'inquiry-1',
      token: 'r'.repeat(32),
    });
  });
});
