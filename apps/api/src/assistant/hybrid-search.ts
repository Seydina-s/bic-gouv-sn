import type { Lang } from "@bgs/shared-types";
import type { PassageIndex, ScoredPassage } from "./passage-search";
import type { Passage } from "./passages";

/*
 * Search by words and by meaning, combined (AI-02). Each finds passages the other
 * misses: words catch names and numbers, meaning catches questions asked in other
 * words. Their rankings are fused by rank, not by score, since the two scores are
 * not comparable. Measured on the test set: the right page among the first 5 for
 * 97 % of questions, against 82 % by words alone (docs/cadrage).
 */

/** Turns texts into unit vectors, whoever provides the model (interfaces first). */
export interface EmbeddingProvider {
  readonly model: string;
  /** One unit vector per text, in order; questions and passages may be encoded apart. */
  embed(
    texts: readonly string[],
    role: "query" | "passage",
    signal: AbortSignal,
  ): Promise<Float32Array[]>;
}

/** Usual constant of reciprocal rank fusion: how fast lower ranks stop counting. */
const FUSION_K = 60;
/** Each search proposes this many passages to the fusion. */
const CANDIDATES = 40;

/** Passages and their vectors, searched by similarity (pgvector replaces it at scale). */
export class VectorIndex {
  private readonly byLang = new Map<Lang, { passage: Passage; vector: Float32Array }[]>();

  constructor(entries: readonly { passage: Passage; vector: Float32Array }[]) {
    for (const entry of entries) {
      const group = this.byLang.get(entry.passage.lang) ?? [];
      group.push(entry);
      this.byLang.set(entry.passage.lang, group);
    }
  }

  search(query: Float32Array, { lang, limit }: { lang: Lang; limit: number }): ScoredPassage[] {
    return (this.byLang.get(lang) ?? [])
      .map(({ passage, vector }) => ({ passage, score: dot(query, vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

function dot(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    sum += (a[i] ?? 0) * (b[i] ?? 0);
  }
  return sum;
}

/** Passages ranked by the sum of 1 / (K + rank) over the rankings that contain them. */
export function fuseRankings(
  rankings: readonly (readonly ScoredPassage[])[],
  limit: number,
): ScoredPassage[] {
  const fused = new Map<string, ScoredPassage>();
  for (const ranking of rankings) {
    ranking.forEach(({ passage }, position) => {
      const gain = 1 / (FUSION_K + position + 1);
      const current = fused.get(passage.id);
      fused.set(passage.id, { passage, score: (current?.score ?? 0) + gain });
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export interface HybridDependencies {
  words: PassageIndex;
  vectors: VectorIndex;
  embedder: EmbeddingProvider;
  /** Deadline and circuit breaker of the embedding calls (@bgs/resilience). */
  call: <T>(operation: (signal: AbortSignal) => Promise<T>) => Promise<T>;
}

/**
 * Both searches fused; by words alone when the model cannot be reached, so the
 * assistant keeps answering (graceful degradation, CLAUDE.md §4.5).
 */
export async function hybridSearch(
  query: string,
  { lang, limit }: { lang: Lang; limit: number },
  { words, vectors, embedder, call }: HybridDependencies,
): Promise<ScoredPassage[]> {
  const byWords = words.search(query, { lang, limit: CANDIDATES });
  let vector: Float32Array | undefined;
  try {
    [vector] = await call((signal) => embedder.embed([query], "query", signal));
  } catch {
    return byWords.slice(0, limit);
  }
  if (vector === undefined) {
    return byWords.slice(0, limit);
  }
  const byMeaning = vectors.search(vector, { lang, limit: CANDIDATES });
  return fuseRankings([byWords, byMeaning], limit);
}
