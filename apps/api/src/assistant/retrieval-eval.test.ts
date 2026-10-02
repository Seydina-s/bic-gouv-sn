import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";
import {
  rankOf,
  retrievalSetSchema,
  summarize,
  unknownPages,
  type CaseResult,
} from "./retrieval-eval";

// Placeholder texts, not real content.
function passage(page: string, part: number, title: string, text: string): Passage {
  return {
    id: `${page}:fr:${String(part)}`,
    contentId: page,
    kind: "procedure",
    lang: "fr",
    status: "official",
    title,
    sourceUrl: `https://e-senegal.sn/#/demarche/${page}`,
    publishedOn: null,
    contentHash: "1".repeat(64),
    text,
  };
}

const index = new PassageIndex([
  passage("a", 0, "Démarche du port", "Le port de test, le port encore."),
  passage("a", 1, "Démarche du port", "Encore le port de test."),
  passage("b", 0, "Démarche du quai", "Le quai et le port de test."),
  passage("c", 0, "Autre démarche", "Rien à voir."),
]);

const url = (page: string) => `https://e-senegal.sn/#/demarche/${page}`;

describe("rankOf", () => {
  it("ranks pages, not passages: two passages of one page count once", () => {
    const result = rankOf(index, { question: "le port", style: "direct", expected: [url("b")] });
    expect(result.rank).toBe(2);
  });

  it("gives no rank when the expected page is not found", () => {
    const result = rankOf(index, { question: "le port", style: "direct", expected: [url("c")] });
    expect(result.rank).toBeNull();
  });
});

describe("summarize", () => {
  it("counts the share within each rank and the mean reciprocal rank", () => {
    const testCase = { question: "q", style: "direct" as const, expected: [url("a")] };
    const results: CaseResult[] = [
      { testCase, rank: 1 },
      { testCase, rank: 4 },
      { testCase, rank: null },
      { testCase, rank: 12 },
    ];
    expect(summarize(results)).toEqual({
      cases: 4,
      within: { 1: 0.25, 3: 0.25, 5: 0.5, 10: 0.5 },
      meanReciprocalRank: (1 + 1 / 4 + 1 / 12) / 4,
    });
    expect(summarize([]).meanReciprocalRank).toBe(0);
  });
});

describe("the test set of the repository", () => {
  it("is valid and lists each expected page once", async () => {
    const raw: unknown = JSON.parse(
      await readFile(new URL("../../data/assistant-retrieval-eval.json", import.meta.url), "utf8"),
    );
    const { cases } = retrievalSetSchema.parse(raw);
    expect(cases.length).toBeGreaterThanOrEqual(30);
    expect(unknownPages(cases, new Set(cases.flatMap(({ expected }) => expected)))).toEqual([]);
    expect(unknownPages(cases.slice(0, 1), new Set())).toEqual(cases[0]?.expected);
  });
});
