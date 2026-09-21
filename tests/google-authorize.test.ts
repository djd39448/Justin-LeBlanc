/**
 * Verifies sanitized Google setup diagnostics, scope checks, and retry classification.
 * Dependencies: Vitest and pure helpers from google-authorize. Why: setup must fail safely without
 * leaking provider responses or duplicating an uncertain calendar create.
 */
import { describe, expect, it } from 'vitest';

import {
  diagnoseGoogleError,
  missingCalendarScopes,
  provisioningRetryAllowed,
} from '../scripts/google-authorize.js';

describe('Google Calendar setup safety', () => {
  it('extracts SERVICE_DISABLED remediation without returning provider message PII', () => {
    const diagnostic = diagnoseGoogleError(403, {
      error: {
        message: 'user@example.test token-secret-value',
        status: 'PERMISSION_DENIED',
        details: [
          {
            reason: 'SERVICE_DISABLED',
            metadata: {
              activationUrl:
                'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=demo-project',
            },
          },
        ],
      },
    });

    expect(diagnostic).toEqual({
      httpStatus: 403,
      reasons: ['PERMISSION_DENIED', 'SERVICE_DISABLED'],
      activationUrl:
        'https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=demo-project',
    });
    expect(JSON.stringify(diagnostic)).not.toContain('user@example.test');
    expect(JSON.stringify(diagnostic)).not.toContain('token-secret-value');
  });

  it('rejects a freebusy-only grant before calendar creation', () => {
    expect(
      missingCalendarScopes('openid email https://www.googleapis.com/auth/calendar.freebusy'),
    ).toEqual(['https://www.googleapis.com/auth/calendar.app.created']);
  });

  it('permits create retry only after a definitive prior failure', () => {
    expect(provisioningRetryAllowed(undefined)).toBe(true);
    expect(provisioningRetryAllowed({ status: 'definitive_failure' })).toBe(true);
    expect(provisioningRetryAllowed({ status: 'attempting' })).toBe(false);
    expect(provisioningRetryAllowed({ status: 'uncertain' })).toBe(false);
    expect(provisioningRetryAllowed({ status: 'created' })).toBe(false);
  });
});
