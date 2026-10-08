import { z } from "zod";
import type { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";

/*
 * Measures the passage search on a set of questions, each linked to the official
 * page that answers it (AI-04): how often that page comes first, or among the
 * first 3, 5 or 10 pages. The same set will compare the lexical search with the
 * search by meaning, before a provider is chosen.
 */

export const retrievalCaseSchema = z.strictObject({
  question: z.string().min(3),
  /** "direct" reuses the words of the source; "reformulated" asks in other words. */
  style: z.enum(["direct", "reformulated"]),
  expected: z.array(z.url({ protocol: /^https$/ })).min(1),
});
export type RetrievalCase = z.infer<typeof retrievalCaseSchema>;

export const retrievalSetSchema = z.strictObject({
  about: z.string().min(1),
  cases: z.array(retrievalCaseSchema).min(1),
});

export const RANKS = [1, 3, 5, 10] as const;
/** Passages read to rank the pages: several passages often come from one page. */
const DEPTH = 60;

export interface CaseResult {
  testCase: RetrievalCase;
  /** Position of the expected page among the pages found, from 1; null if absent. */
  rank: number | null;
}

export interface RetrievalSummary {
  cases: number;
  /** Share of questions whose page is within each rank, from 0 to 1. */
  within: Record<(typeof RANKS)[number], number>;
  /** Mean of 1 / rank (0 when absent): 1 means always first. */
  meanReciprocalRank: number;
}

/** The passages a search finds for a question, best first. */
export type Search = (question: string, depth: number) => readonly Passage[];

/** The search by words alone, the baseline. */
export function byWordsOnly(index: PassageIndex): Search {
  return (question, depth) =>
    index.search(question, { lang: "fr", limit: depth }).map(({ passage }) => passage);
}

export function rankOf(search: Search, testCase: RetrievalCase): CaseResult {
  const found = search(testCase.question, DEPTH);
  const pages = [...new Set(found.map((passage) => passage.sourceUrl))];
  const position = pages.findIndex((url) => testCase.expected.includes(url));
  return { testCase, rank: position < 0 ? null : position + 1 };
}

export function summarize(results: readonly CaseResult[]): RetrievalSummary {
  const share = (limit: number) =>
    results.filter(({ rank }) => rank !== null && rank <= limit).length /
    Math.max(results.length, 1);
  const reciprocal = results.reduce((sum, { rank }) => sum + (rank === null ? 0 : 1 / rank), 0);
  return {
    cases: results.length,
    within: { 1: share(1), 3: share(3), 5: share(5), 10: share(10) },
    meanReciprocalRank: reciprocal / Math.max(results.length, 1),
  };
}

/** Expected pages missing from the base: the set or the base must be corrected. */
export function unknownPages(
  cases: readonly RetrievalCase[],
  known: ReadonlySet<string>,
): string[] {
  return cases.flatMap(({ expected }) => expected.filter((url) => !known.has(url)));
}
