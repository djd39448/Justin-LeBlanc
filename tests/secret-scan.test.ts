import { describe, expect, it } from 'vitest';

import { scanFiles, scanText, sortFindings } from '../scripts/scan-secrets.js';

describe('secret scanner', () => {
  it('detects high-confidence formats without returning secret values', () => {
    const findings = scanText(
      [
        `const key = "${['sk-proj-', '1234567890abcdefghijklmnopqrstuv'].join('')}";`,
        `const legacyKey = "${['sk-', 'zyxwvutsrqponmlkjihgfedcba098765'].join('')}";`,
        `AWS_ACCESS_KEY_ID=${['AKIA', '1234567890ABCDEF'].join('')}`,
        `-----BEGIN ${['RSA', 'PRIVATE KEY'].join(' ')}-----`,
        `token = "${['abcdefghijklmnopqrstuvwxyz', '0123456789ABCDEFGH'].join('')}"`,
      ].join('\n'),
      'fixtures/secrets.ts',
    );
    expect(findings.map(({ rule }) => rule)).toEqual([
      'openai-project-key',
      'openai-api-key',
      'aws-access-key-id',
      'private-key',
      'high-entropy-assignment',
    ]);
    expect(JSON.stringify(findings)).not.toContain('1234567890abcdefghijklmnopqrstuv');
    expect(findings[0]?.fingerprint).toMatch(/^[a-f0-9]{12}$/);
  });

  it('does not flag documented placeholders or low-entropy test fixtures', () => {
    const findings = scanText(
      'OPENAI_API_KEY=test-only\nADMIN_TOKEN=${ADMIN_TOKEN}\nSECRET=change-me\nTOKEN=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '.env.example',
    );
    expect(findings).toEqual([]);
  });

  it('skips binary and excluded paths and sorts explicit files deterministically', () => {
    const root = process.cwd();
    const findings = scanFiles(root, [
      'node_modules/fake.ts',
      'dist/fake.ts',
      'evidence/screenshot.txt',
    ]);
    expect(findings).toEqual([]);
    expect(
      sortFindings([
        { path: 'z.ts', line: 1, rule: 'b', fingerprint: '2' },
        { path: 'a.ts', line: 4, rule: 'z', fingerprint: '3' },
        { path: 'a.ts', line: 2, rule: 'z', fingerprint: '1' },
      ]),
    ).toEqual([
      { path: 'a.ts', line: 2, rule: 'z', fingerprint: '1' },
      { path: 'a.ts', line: 4, rule: 'z', fingerprint: '3' },
      { path: 'z.ts', line: 1, rule: 'b', fingerprint: '2' },
    ]);
  });
});
