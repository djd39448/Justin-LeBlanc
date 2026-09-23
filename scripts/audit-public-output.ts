/**
 * Audits the built website for public assistant, phone, pricing, and engineering copy leaks.
 *
 * Dependencies:
 *   - Node filesystem/path APIs for deterministic inspection of the Astro build directory.
 *
 * Depended on by:
 *   - The round-two release gate and CI verification scripts.
 *
 * Why this exists:
 *   Public assistant removal is a release boundary, so source-level assertions are insufficient;
 *   the deployable HTML, scripts, metadata, sitemap, and reference artifacts must also be clean.
 *
 * Usage:
 *   node --import tsx scripts/audit-public-output.ts
 *   node --import tsx scripts/audit-public-output.ts --directory apps/web/dist --json
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BUILD_DIRECTORY = 'apps/web/dist';
const TEXT_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.js',
  '.json',
  '.svg',
  '.txt',
  '.webmanifest',
  '.xml',
]);

interface Finding {
  file: string;
  label: string;
}

interface AuditResult {
  directory: string;
  filesScanned: number;
  findings: Finding[];
}

const forbiddenPatterns: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'Retell demo phone number', pattern: /(?:\+1\s*)?\(?832\)?[\s.-]*501[\s.-]*3799/i },
  { label: 'unexpected telephone URL', pattern: /\btel:(?!\+18323039116\b)[^"'\s<]+/i },
  { label: 'voice component identifier', pattern: /VoicePanel/i },
  { label: 'chat component identifier', pattern: /ChatPanel/i },
  { label: 'public voice-number field', pattern: /demoVoicePhoneNumber/i },
  { label: 'public chat API call', pattern: /\/api\/chat(?:["'/?]|$)/i },
  { label: 'public voice API call', pattern: /\/api\/(?:voice|retell)(?:["'/?]|$)/i },
  { label: 'chatbot presentation', pattern: /\bchatbot\b/i },
  { label: 'voice-assistant presentation', pattern: /\bvoice[- ]assistant\b/i },
  { label: 'AI-assistant presentation', pattern: /\bAI assistant\b/i },
  { label: 'published demo pricing', pattern: /\$(?:700|750|900|1,000|1,250|2,000)\b/i },
  { label: 'demo-pricing copy', pattern: /\b(?:illustrative|published) demo pric(?:e|ing)\b/i },
  { label: 'package pricing markup', pattern: /package-price/i },
  { label: 'public scheduling-card identifier', pattern: /schedule-card/i },
  {
    label: 'public consultation-and-hold prompt',
    pattern: /Choose a consultation and tentative event time/i,
  },
  { label: 'deprecated three-step inquiry copy', pattern: /Three short steps/i },
  { label: 'deprecated event-city label', pattern: />\s*Event city\s*</i },
  { label: 'deprecated atmosphere-review step', pattern: /Shape the atmosphere, then review/i },
  { label: 'deprecated USD budget label', pattern: /Estimated budget \(USD, optional\)/i },
  { label: 'customer-facing isolated-demo copy', pattern: /\bisolated demo\b/i },
  { label: 'customer-facing canonical-demo copy', pattern: /\bcanonical demo\b/i },
  { label: 'customer-facing agent-reference copy', pattern: /\bagent reference\b/i },
  { label: 'customer-facing confirmation-boundary copy', pattern: /\bconfirmation boundaries\b/i },
  { label: 'customer-facing reviewed-facts copy', pattern: /\breviewed booking facts\b/i },
];

function listTextFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) files.push(...listTextFiles(path));
    else if (stats.isFile() && TEXT_EXTENSIONS.has(extname(path))) files.push(path);
  }
  return files;
}

/**
 * Inspects deployable text artifacts and returns every forbidden public-output match.
 *
 * @param directory Astro build directory to inspect recursively.
 * @returns Deterministic file count and redacted pattern labels; matched content is not echoed.
 */
export function auditPublicOutput(directory: string): AuditResult {
  const absoluteDirectory = resolve(directory);
  const files = listTextFiles(absoluteDirectory).sort();
  const findings: Finding[] = [];
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    for (const forbidden of forbiddenPatterns) {
      if (forbidden.pattern.test(contents)) {
        findings.push({
          file: relative(absoluteDirectory, file),
          label: forbidden.label,
        });
      }
    }
  }
  return { directory: absoluteDirectory, filesScanned: files.length, findings };
}

function help(): string {
  return [
    'Audit built public output for round-two copy and privacy leaks.',
    '',
    'Usage:',
    '  node --import tsx scripts/audit-public-output.ts [--directory <path>] [--json]',
    '',
    `Default directory: ${DEFAULT_BUILD_DIRECTORY}`,
  ].join('\n');
}

function readArguments(args: string[]): { directory: string; json: boolean; help: boolean } {
  let directory = DEFAULT_BUILD_DIRECTORY;
  let json = false;
  let showHelp = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--json') json = true;
    else if (argument === '--help' || argument === '-h') showHelp = true;
    else if (argument === '--directory') {
      const value = args[index + 1];
      if (value === undefined || value.startsWith('-')) {
        throw new Error('--directory requires a path; pass the Astro build directory.');
      }
      directory = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument ${argument}; run with --help for supported options.`);
    }
  }
  return { directory, json, help: showHelp };
}

function main(): void {
  try {
    const options = readArguments(process.argv.slice(2));
    if (options.help) {
      process.stdout.write(`${help()}\n`);
      return;
    }
    const result = auditPublicOutput(options.directory);
    if (options.json) process.stdout.write(`${JSON.stringify(result)}\n`);
    else if (result.findings.length === 0)
      process.stdout.write(`Public-output audit passed across ${result.filesScanned} files.\n`);
    else {
      process.stderr.write(
        `Public-output audit found ${result.findings.length} forbidden artifact(s).\n`,
      );
      for (const finding of result.findings) {
        process.stderr.write(`- ${finding.file}: ${finding.label}\n`);
      }
    }
    if (result.findings.length > 0) process.exitCode = 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `Public-output audit failed in scripts/audit-public-output.ts: ${message} Rebuild the Astro site and retry with --directory apps/web/dist.`,
    );
    process.exitCode = 1;
  }
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) main();
