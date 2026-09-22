/**
 * Deterministic, high-confidence secret scan for tracked and non-ignored source files.
 *
 * The scanner intentionally reports only a path, line, rule, and short fingerprint;
 * it never prints a candidate secret. Use `--help` for the operator contract and
 * `--json` for machine-readable findings.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export type SecretFinding = {
  fingerprint: string;
  line: number;
  path: string;
  rule: string;
};

const SKIP_PARTS = new Set(['.git', 'node_modules', 'dist', 'build']);
const TEXT_EXTENSIONS = new Set([
  '.astro',
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.sql',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.xml',
  '.yaml',
  '.yml',
]);
const PLACEHOLDER =
  /^(?:$|test(?:[-_ ]only)?|example|placeholder|dummy|synthetic|changeme|change[-_ ]?me|replace(?:[-_ ]?me)?|your[-_ ]?(?:token|secret|key)|\$\{[^}]+\}|<[^>]+>|xxx+|redacted)$/i;

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}

function entropy(value: string): number {
  const counts = new Map<string, number>();
  for (const character of value) counts.set(character, (counts.get(character) ?? 0) + 1);
  return [...counts.values()].reduce((sum, count) => {
    const probability = count / value.length;
    return sum - probability * Math.log2(probability);
  }, 0);
}

function addFinding(
  findings: SecretFinding[],
  path: string,
  line: number,
  rule: string,
  value: string,
) {
  findings.push({ fingerprint: fingerprint(value), line, path, rule });
}

function genericAssignment(line: string): { value: string; match: string } | undefined {
  const match = line.match(
    /\b(?:api[_-]?key|password|private[_-]?key|secret|token|webhook)\b\s*[:=]\s*(?:(['"])(.*?)\1|([A-Za-z0-9_./+=-]+))/i,
  );
  if (match === null) return undefined;
  const value = match[2] ?? match[3];
  if (!value) return undefined;
  if (match[2] === undefined && (value.includes('.') || /^[A-Z0-9_]+$/.test(value)))
    return undefined;
  if (PLACEHOLDER.test(value) || value.length < 24 || entropy(value) < 3.5) return undefined;
  return { match: match[0], value };
}

/** Scan one text buffer. This is exported so tests can exercise detection without filesystem access. */
export function scanText(text: string, path = '<memory>'): SecretFinding[] {
  const findings: SecretFinding[] = [];
  text.split(/\r?\n/).forEach((line, index) => {
    const lineNumber = index + 1;
    const patterns: Array<[string, RegExp]> = [
      ['private-key', /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/],
      ['openai-project-key', /\bsk-proj-[A-Za-z0-9_-]{20,}\b/],
      ['openai-api-key', /\bsk-(?!proj-)[A-Za-z0-9_-]{20,}\b/],
      ['github-token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/],
      ['aws-access-key-id', /\bAKIA[0-9A-Z]{16}\b/],
      ['google-oauth-refresh-token', /\b1\/\/?[A-Za-z0-9_-]{20,}\b/],
      ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
      [
        'slack-webhook',
        /https:\/\/hooks\.slack\.com\/services\/T[A-Z0-9]+\/B[A-Z0-9]+\/[A-Za-z0-9]+/,
      ],
    ];
    for (const [rule, pattern] of patterns) {
      const match = line.match(pattern);
      if (match?.[0]) addFinding(findings, path, lineNumber, rule, match[0]);
    }
    const generic = genericAssignment(line);
    if (generic) addFinding(findings, path, lineNumber, 'high-entropy-assignment', generic.value);
  });
  return findings;
}

function shouldSkip(path: string): boolean {
  const parts = path.split(/[\\/]/);
  return parts.some(
    (part) => SKIP_PARTS.has(part) || part.endsWith('.png') || part.endsWith('.jpg'),
  );
}

function likelyText(path: string, buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  const extension = extname(path).toLowerCase();
  return TEXT_EXTENSIONS.has(extension) || basename(path).startsWith('.env');
}

/** Scan explicit files; paths are normalized and findings are sorted for reproducibility. */
export function scanFiles(root: string, files: string[]): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const file of [...new Set(files)].sort()) {
    const absolute = resolve(root, file);
    if (shouldSkip(file) || !existsSync(absolute) || !statSync(absolute).isFile()) continue;
    const buffer = readFileSync(absolute);
    if (!likelyText(file, buffer)) continue;
    const displayPath = relative(root, absolute).split(sep).join('/');
    findings.push(...scanText(buffer.toString('utf8'), displayPath));
  }
  return sortFindings(findings);
}

export function sortFindings(findings: SecretFinding[]): SecretFinding[] {
  return [...findings].sort(
    (a, b) => a.path.localeCompare(b.path) || a.line - b.line || a.rule.localeCompare(b.rule),
  );
}

function repositoryFiles(root: string): string[] {
  const output = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
    cwd: root,
    encoding: 'utf8',
  });
  return output.split(/\r?\n/).filter(Boolean);
}

export function scanRepository(root = process.cwd()): SecretFinding[] {
  return scanFiles(root, repositoryFiles(root));
}

function help(): string {
  return [
    'Usage: tsx scripts/scan-secrets.ts [--json] [--help]',
    '',
    'Scans tracked and non-ignored regular text files for high-confidence committed secrets.',
    'Findings include only path, line, rule, and a non-reversible fingerprint.',
    'Exit status: 0 when clean; 1 when findings exist; 2 for usage or scan errors.',
  ].join('\n');
}

function writeStdout(message: string): void {
  process.stdout.write(`${message}\n`);
}

export function runCli(args: string[] = process.argv.slice(2)): number {
  if (args.includes('--help')) {
    writeStdout(help());
    return 0;
  }
  const json = args.includes('--json');
  if (args.some((arg) => arg !== '--json')) {
    console.error('Unknown argument. Use --help for usage.');
    return 2;
  }
  try {
    const findings = scanRepository();
    if (json) writeStdout(JSON.stringify({ findings, clean: findings.length === 0 }, null, 2));
    else if (findings.length === 0) writeStdout('Secret scan clean: no high-confidence findings.');
    else {
      console.error(
        `Secret scan found ${findings.length} finding(s); values are intentionally redacted.`,
      );
      for (const finding of findings) {
        console.error(
          `${finding.path}:${finding.line} ${finding.rule} fingerprint=${finding.fingerprint} — remove the secret and rotate it if live.`,
        );
      }
    }
    return findings.length === 0 ? 0 : 1;
  } catch (error) {
    console.error(
      `Secret scan failed: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = runCli();
}
