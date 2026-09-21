/** Tests auth and recipient refusal. Dependencies: security/config and Vitest. Consumers: CI.
 * Why: matching a From header or public identifier must never confer operator authority. */
import { describe, expect, it } from 'vitest';

import { assertRecipients, ConfigSchema } from '../apps/api/config.js';
import { authorized } from '../apps/api/security.js';

describe('operator boundaries', () => {
  it('rejects absent and prefix-matched bearer tokens', () => {
    expect(authorized(undefined, 'secret')).toBe(false);
    expect(authorized('Bearer secre', 'secret')).toBe(false);
    expect(authorized('Bearer secret', 'secret')).toBe(true);
  });
  it('checks BCC as well as To and refuses non-demo deployment', () => {
    const config = ConfigSchema.parse({
      ADMIN_TOKEN: 'a'.repeat(40),
      JOB_AUTH_SECRET: 'j'.repeat(40),
      DEMO_RECIPIENT_ALLOWLIST: 'client@example.com',
      OPERATOR_EMAIL: 'operator@example.com',
      PERFORMER_EMAIL: 'operator@example.com',
      CLIENT_TEST_EMAIL: 'client@example.com',
    });
    expect(() => assertRecipients(config, ['client@example.com', 'operator@example.com'])).toThrow(
      'Recipient blocked',
    );
    expect(() => assertRecipients({ ...config, DEMO_MODE: false }, ['client@example.com'])).toThrow(
      'DEMO_MODE',
    );
  });
});
