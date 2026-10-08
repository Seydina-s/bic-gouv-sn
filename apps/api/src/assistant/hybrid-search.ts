import type { Lang } from "@bgs/shared-types";
import type { PassageIndex, ScoredPassage } from "./passage-search";
import type { Passage } from "./passages";

/*
 * Search by meaning, with the search by words fused in or kept as a fallback
 * (AI-02). Measured on the test set (docs/cadrage): a small model gains from the
 * fusion (94 % of right pages in the first 5, against 88 % alone), a medium one
 * does better alone (94 % in the first 3, 89 % fused); `fuseWords` follows the
 * model chosen. Rankings are fused by rank, not by score: the scores differ in kind.
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
  weights: readonly number[] = [],
): ScoredPassage[] {
  const fused = new Map<string, ScoredPassage>();
  for (const [index, ranking] of rankings.entries()) {
    const weight = weights[index] ?? 1;
    ranking.forEach(({ passage }, position) => {
      const gain = weight / (FUSION_K + position + 1);
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
  /** Fuse the words into the meaning's ranking (small model), or keep them as a fallback. */
  fuseWords: boolean;
}

/**
 * Both searches fused; by words alone when the model cannot be reached, so the
 * assistant keeps answering (graceful degradation, CLAUDE.md §4.5).
 */
export async function hybridSearch(
  query: string,
  { lang, limit }: { lang: Lang; limit: number },
  { words, vectors, embedder, call, fuseWords }: HybridDependencies,
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
  if (!fuseWords) {
    return vectors.search(vector, { lang, limit });
  }
  const byMeaning = vectors.search(vector, { lang, limit: CANDIDATES });
  return fuseRankings([byWords, byMeaning], limit);
}
