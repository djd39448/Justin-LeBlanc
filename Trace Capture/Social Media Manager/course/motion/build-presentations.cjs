#!/usr/bin/env node
/**
 * Generates lesson HTML shells and the retained approved-opening adapter.
 * Depends on the approved preview, curriculum, template and curated storyboards.
 * Consumed by the offline production pipeline and maintainers; no narration is generated.
 * Usage: node course/motion/build-presentations.cjs --all --json
 */
'use strict';
/* eslint @typescript-eslint/no-require-imports: "off" -- Repository media tooling uses CommonJS. */
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireProject = createRequire(path.resolve(__dirname, '../../../..', 'package.json'));
const { Command } = requireProject('commander');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const escape = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function approvedOpening() {
  const source = read('style-preview/index.html');
  const start = source.indexOf('<section class="scene paper" id="arrival">');
  const end = source.indexOf('<div id="caption"', start);
  if (start < 0 || end < start)
    throw new Error('Approved preview structure changed; reconcile the opening adapter.');
  const html = source
    .slice(start, end)
    .replaceAll('src="assets/performer.png"', 'src="{{BASE}}motion/assets/performer.png"');
  const js = read('style-preview/preview.js');
  const functions = js.slice(js.indexOf('  function reveal('), js.indexOf('  function timeLabel('));
  if (!functions.includes('function drawJourney'))
    throw new Error('Approved opening functions missing; restore preview source.');
  const adapter = `/** Generated from the approved style preview. Dependencies: COURSE_DATA and opening markup.
 * Consumed by visuals.js for Lesson 01; preserve the accepted first 69 seconds. */
(() => { 'use strict';
const $ = id => document.getElementById(id);
const second = window.COURSE_DATA.scenes[1].start;
const nodes = [...document.querySelectorAll('#approved-opening .scene')];
const ranges = [0,8.661,13.201,21.943,second,second+10.588,second+24.312];
const names=['The idea','The desired experience','The quick start','The open questions','Make decisions visible','Cloud → Contract → Code','Lead the conversation'];
let reduce = false;
const clamp=v=>Math.min(1,Math.max(0,v));
const ease=v=>1-(1-clamp(v))**3;
const progress=(t,start,length=.65)=>reduce?Number(t>=start):ease((t-start)/length);
${functions}
/** Draw the approved opening at absolute narration seconds; honor reduced motion. */
window.renderApprovedOpening=(seconds,reduced)=>{reduce=reduced;setScenes(seconds);drawOpening(seconds);drawQuestions(seconds);drawJourney(seconds);};
})();\n`;
  fs.writeFileSync(path.join(__dirname, 'approved-opening.js'), adapter);
  return html;
}

function generate(id, opening, catalog) {
  const lesson = catalog.lessons.find((item) => item.id === id);
  if (!lesson) throw new Error(`Unknown lesson ${id}; choose 01 through 10.`);
  const storyboard = JSON.parse(read(`motion/storyboards/${id}.json`));
  const directory = id === '01' ? 'pilot' : `productions/${id}`;
  const base = id === '01' ? '../' : '../../';
  let html = read('motion/presentation-template.html');
  const replacements = {
    OPENING: id === '01' ? opening : '',
    TITLE: escape(lesson.title),
    LESSON: id,
    OBJECTIVE: escape(lesson.objective),
    OUTLINE: storyboard.scenes
      .map((s) => `<li><strong>${escape(s.title)}</strong>: ${escape(s.intro)}</li>`)
      .join('\n'),
  };
  for (const [key, value] of Object.entries(replacements))
    html = html.replaceAll(`{{${key}}}`, value);
  html = html.replaceAll('{{BASE}}', base);
  const output = path.join(root, directory, 'presentation.html');
  fs.writeFileSync(output, html);
  return { lesson: id, presentation: path.relative(root, output) };
}

const cli = new Command()
  .description('Generate animated lesson presentations from approved local sources.')
  .option('--all', 'Build all ten lessons')
  .option('--lesson <id>', 'Build one lesson, 01 through 10')
  .option('--json', 'Emit machine-readable results');
cli.parse();
try {
  const options = cli.opts();
  if (!options.all && !/^(0[1-9]|10)$/.test(options.lesson || ''))
    throw new Error('Use --all or --lesson 01..10. See --help.');
  const catalog = JSON.parse(read('curriculum.json'));
  const opening = approvedOpening();
  const ids = options.all ? catalog.lessons.map((l) => l.id) : [options.lesson];
  const results = ids.map((id) => generate(id, opening, catalog));
  process.stdout.write(
    options.json
      ? `${JSON.stringify(results, null, 2)}\n`
      : `Generated ${results.length} animated presentations.\n`,
  );
} catch (error) {
  process.stderr.write(`Presentation generation failed: ${error.message}\n`);
  process.exitCode = 1;
}
