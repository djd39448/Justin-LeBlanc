#!/usr/bin/env node
/**
 * Produces all ten animated course lessons offline from unchanged approved Brian recordings.
 * Dependencies: lib audio/render/verify/server adapters and the repository's Commander installation.
 * Consumed by: course maintainers, verification scripts and the documented production workflow.
 * Why: one reproducible entry point updates browser presentations and videos without voice regeneration.
 * Usage: node course/motion/build-course.cjs prepare --all --json
 *        node course/motion/build-course.cjs render --lesson01 --json
 *        node course/motion/build-course.cjs serve --port4175 --json
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Offline tooling uses CommonJS consistently. */
const c = require('./lib/common.cjs');
const { prepare } = require('./lib/audio.cjs');
const { render, stills, audit } = require('./lib/render.cjs');
const { verify } = require('./lib/verify.cjs');
const { startServer } = require('./lib/server.cjs');
const { Command } = c.projectRequire('commander');
function normalizeArgs(args) {
  return args.flatMap((arg) =>
    /^--lesson\d{2}$/.test(arg)
      ? ['--lesson', arg.slice(-2)]
      : /^--port\d+$/.test(arg)
        ? ['--port', arg.slice(6)]
        : [arg],
  );
}
function summary(result) {
  if (!result.video) return result;
  return {
    lesson: result.lesson,
    status: result.status,
    duration: result.duration,
    bytes: result.bytes,
    browserCaptures: result.browserCaptures,
    fullDecode: result.fullDecode,
    originalAudioClips: result.originalAudioClips,
  };
}
async function main() {
  const program = new Command();
  program
    .name('build-course')
    .description(
      'Offline animated HTML-to-video course production; never generates narration or calls a provider.',
    )
    .argument('<operation>', 'prepare | stills | audit | render | verify | serve | baseline')
    .option('--lesson <id>', 'two-digit lesson01..10')
    .option('--all', 'run all ten lessons sequentially')
    .option('--port <number>', 'loopback preview port', '4175')
    .option('--json', 'emit machine-readable results')
    .addHelpText(
      'after',
      '\nExamples:\n  node course/motion/build-course.cjs prepare --all --json\n  node course/motion/build-course.cjs stills --lesson01 --json\n  node course/motion/build-course.cjs render --lesson01 --json\n  node course/motion/build-course.cjs verify --all --json\n  node course/motion/build-course.cjs serve --port4175 --json\n',
    );
  program.exitOverride();
  try {
    program.parse(normalizeArgs(process.argv));
  } catch (error) {
    if (error.code === 'commander.helpDisplayed') return;
    throw error;
  }
  const operation = program.args[0],
    options = program.opts();
  if (!['prepare', 'stills', 'audit', 'render', 'verify', 'serve', 'baseline'].includes(operation))
    throw new Error('Unknown operation. Run --help for supported production stages.');
  if (operation === 'serve') {
    const port = Number(options.port);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Port must be1024..65535.');
    const local = await startServer(port);
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => local.server.close());
    process.stdout.write(
      JSON.stringify({ status: 'ready', url: local.origin + '/', byteRanges: true }) + '\n',
    );
    return;
  }
  if (operation === 'baseline') {
    process.stdout.write(
      JSON.stringify({ status: 'verified', originalSources: c.assertBaseline(), audioClips: 130 }) +
        '\n',
    );
    return;
  }
  if (
    Boolean(options.all) === Boolean(options.lesson) ||
    (options.lesson && !c.IDS.includes(options.lesson))
  )
    throw new Error('Choose exactly one of --all or --lesson01..10.');
  const results = [];
  for (const id of options.all ? c.IDS : [options.lesson]) {
    const result =
      operation === 'prepare'
        ? prepare(id)
        : operation === 'stills'
          ? await stills(id)
          : operation === 'audit'
            ? await audit(id)
            : operation === 'render'
              ? await render(id)
              : verify(id, undefined, { checkExistingReport: true });
    results.push(summary(result));
    process.stderr.write(`Lesson${id} ${operation}: complete\n`);
  }
  process.stdout.write(JSON.stringify(results, null, options.json ? 2 : 0) + '\n');
  if (
    results.some(
      (result) =>
        result.status === 'defects' || (result.browserErrors && result.browserErrors.length),
    )
  )
    process.exitCode = 1;
}
main().catch((error) => {
  process.stderr.write(
    `Animated course production failed: ${error.message}\nRestore the named source, correct the storyboard, or inspect the reported stage before retrying.\n`,
  );
  process.exitCode = error.code && error.code.startsWith('commander.') ? 2 : 1;
});
