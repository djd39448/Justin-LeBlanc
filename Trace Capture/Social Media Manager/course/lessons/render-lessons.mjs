/** Render standalone lesson HTML from the canonical lesson-source.mjs records. */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { lessons } from './lesson-source.mjs';
import { deepDives } from './deep-dives.mjs';
import { sampleAnswers } from './sample-answers.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const css = `:root{color-scheme:dark;--bg:#08121d;--panel:#102330;--text:#eef4f4;--muted:#b5c6c9;--cyan:#6be4d6;--amber:#ffc779}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#183339 0,transparent 33rem),var(--bg);color:var(--text);font:17px/1.75 system-ui,-apple-system,sans-serif}main{width:min(850px,calc(100% - 40px));margin:0 auto;padding:54px 0 90px}a{color:var(--cyan)}a:focus-visible,summary:focus-visible{outline:3px solid var(--amber);outline-offset:4px}h1,h2,h3{line-height:1.16}h1{font:500 clamp(3rem,8vw,5rem)/1.02 Georgia,serif;letter-spacing:-.04em;margin:15px 0 25px}h2{font:500 2.2rem/1.1 Georgia,serif;margin:54px 0 18px}h3{font-size:1.15rem;margin:28px 0 10px}.eyebrow{color:var(--cyan);font:700 .75rem/1.4 monospace;letter-spacing:.13em;text-transform:uppercase}.lede{font-size:1.2rem;color:var(--muted)}.card,aside,details{border:1px solid #34505a;border-radius:18px;padding:22px 25px;background:#102330;margin:22px 0}aside{border-color:#805f37;background:#2b241b}p,li{max-width:72ch}li+li{margin-top:.45em}strong{color:#fff}summary{cursor:pointer;font-weight:700;color:var(--cyan)}.meta{color:var(--muted)}.script p{margin:0 0 1.1em}footer{border-top:1px solid #34505a;margin-top:60px;padding-top:20px;color:var(--muted)}`;

for (const lesson of lessons) {
  const sections = [...lesson.sections, ...(deepDives[lesson.id] || [])];
  const script = sections.map(([heading, text]) => `<h3>${escape(heading)}</h3>\n<p>${escape(text)}</p>`).join('\n');
  const plan = lesson.sections.map(([heading]) => `<li>${escape(heading)}</li>`).join('');
  const rubric = lesson.rubric.map((item) => `<li>${escape(item)}</li>`).join('');
  const next = lesson.next ? `<a href="${lesson.next}.html">Next lesson →</a>` : '<a href="../index.html">Return to course overview →</a>';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${lesson.id} · ${escape(lesson.title)} | Cloud to Code</title><style>${css}</style></head><body><main>
<nav aria-label="Course navigation"><a href="../index.html">← Course overview</a></nav>
<p class="eyebrow">Lesson ${lesson.id} · Cloud to Code</p><h1>${escape(lesson.title)}.</h1><p class="lede">${escape(lesson.objective)}</p>
<aside><strong>Draft lesson:</strong> The narrated video and animated presentation are not yet approved or available. This page contains an editable lecture draft and practice exercise.</aside>
<section class="card" aria-labelledby="objectives"><h2 id="objectives">What you’ll learn</h2><p>${escape(lesson.objective)}</p><p class="meta">Prerequisite: previous lessons. Practice: ${lesson.id === '10' ? 'approximately 2–4 hours, depending on your project and prior work' : '15–20 minutes'}.</p></section>
<section aria-labelledby="plan"><h2 id="plan">Lesson plan</h2><ol>${plan}</ol></section>
<article class="script" id="lecture-script" aria-labelledby="lecture"><h2 id="lecture">Lecture draft</h2>${script}</article>
<section aria-labelledby="exercise"><h2 id="exercise">Try it yourself</h2><p>${escape(lesson.exercise)}</p></section>
<details><summary>See a completed fictional example</summary><p>${escape(sampleAnswers[lesson.id])}</p></details>
<details><summary>Self-check rubric</summary><p>Check each item and revise anything a fresh reader would have to guess.</p><ul>${rubric}</ul></details>
<footer><p>${next}</p><p>Use synthetic examples; actual external actions require appropriate authorization.</p></footer>
</main></body></html>\n`;
  await writeFile(join(directory, `${lesson.id}.html`), html, 'utf8');
  console.log(`${lesson.id}: ${sections.reduce((sum, [, text]) => sum + text.split(/\s+/).length, 0)} lecture words`);
}
