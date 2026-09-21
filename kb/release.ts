/**
 * Loads, validates, versions, and searches the canonical assistant knowledge base.
 *
 * Dependencies: filesystem JSON, crypto hashing, and Zod boundary validation.
 * Depended on by: OpenAI chat, Retell config generation, website reference checks, and KB CLI.
 * Why this exists: chat and voice must answer from the identical release with source provenance.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

const RELEASE_VERSION = '2026-09-21.3';
const FactSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  source_url: z.string().min(1),
  observed_at: z.iso.date(),
  effective_date: z.iso.date(),
  status: z.enum(['verified_public', 'owner_approved', 'demo_assumption', 'unknown', 'stale']),
  topic: z.string().min(1),
  review_due: z.iso.date(),
});
const FactsSchema = z.array(FactSchema).min(1);
export type KnowledgeFact = z.infer<typeof FactSchema>;
export interface KnowledgeRelease {
  version: string;
  hash: string;
  facts: KnowledgeFact[];
}
export interface KnowledgeAnswer {
  release: string;
  hash: string;
  supported: boolean;
  facts: { id: string; text: string; sourceUrl: string; status: KnowledgeFact['status'] }[];
  nextAction: string | null;
}

/** Reads and hashes the checked-in fact set; duplicate IDs fail the build. */
export function loadKnowledgeRelease(): KnowledgeRelease {
  const path = fileURLToPath(new URL('./facts.json', import.meta.url));
  const facts = FactsSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  const ids = new Set<string>();
  for (const fact of facts) {
    if (ids.has(fact.id)) throw new Error(`Duplicate KB fact ID ${fact.id}; make every ID unique.`);
    ids.add(fact.id);
  }
  const canonical = JSON.stringify(
    [...facts].sort((left, right) => left.id.localeCompare(right.id)),
  );
  return {
    version: RELEASE_VERSION,
    hash: createHash('sha256').update(canonical, 'utf8').digest('hex'),
    facts,
  };
}

/** Searches publishable facts and returns explicit follow-up when the KB cannot support an answer. */
export function searchKnowledge(
  release: KnowledgeRelease,
  question: string,
  topic?: string,
): KnowledgeAnswer {
  const tokens = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
  const ranked = release.facts
    .filter((fact) => topic === undefined || fact.topic === topic)
    .map((fact) => ({
      fact,
      score: tokens.reduce(
        (score, token) => score + (fact.text.toLowerCase().includes(token) ? 1 : 0),
        0,
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.fact.id.localeCompare(right.fact.id))
    .slice(0, 5)
    .map((entry) => entry.fact);
  const supported = ranked.some((fact) => fact.status !== 'unknown' && fact.status !== 'stale');
  return {
    release: release.version,
    hash: release.hash,
    supported,
    facts: ranked.map((fact) => ({
      id: fact.id,
      text: fact.text,
      sourceUrl: fact.source_url,
      status: fact.status,
    })),
    nextAction: supported
      ? null
      : 'Capture the question for human follow-up; do not invent or imply an answer.',
  };
}

/** Produces bounded source context shared verbatim by chat and voice configurations. */
export function renderAssistantContext(release: KnowledgeRelease): string {
  const facts = release.facts
    .map((fact) => `[${fact.id}] (${fact.status}; ${fact.source_url}) ${fact.text}`)
    .join('\n');
  return `KB release ${release.version}; sha256 ${release.hash}\n${facts}`;
}
