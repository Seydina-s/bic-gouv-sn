import { describe, expect, it } from "vitest";
import { translationPass, type TranslationRuns } from "./auto-translation";
import type { BatchClient, CollectReport } from "./batch-translation";

const client: BatchClient = {
  create: () => Promise.resolve("batch"),
  status: () => Promise.resolve({ status: "ended", resultsUrl: null }),
  results: () => Promise.resolve([]),
};

function runs(collected: Partial<CollectReport>, sent: number, calls: string[]): TranslationRuns {
  return {
    collect: () => {
      calls.push("collect");
      return Promise.resolve({
        saved: 0,
        refused: {},
        failed: 0,
        outdated: 0,
        inputTokens: 0,
        outputTokens: 0,
        stillRunning: 0,
        ...collected,
      });
    },
    submit: (_client, model, options) => {
      calls.push(`submit ${model} ${String(options.limit)}`);
      return Promise.resolve({ sent, batchId: sent > 0 ? "batch" : null });
    },
  };
}

describe("a translation pass", () => {
  it("saves what ended, then sends what waits, for each kind and language", async () => {
    const calls: string[] = [];
    const reports = await translationPass(
      [
        {
          name: "articles en",
          runs: runs({ saved: 3, refused: { structure_changed: 1 } }, 2, calls),
        },
        { name: "articles wo", runs: runs({}, 0, calls) },
      ],
      client,
      { model: "claude-sonnet-5-5", since: "2024-04-02" },
    );
    expect(calls).toEqual([
      "collect",
      "submit claude-sonnet-5-5 50",
      "collect",
      "submit claude-sonnet-5-5 50",
    ]);
    expect(reports).toEqual([
      { name: "articles en", saved: 3, refused: 1, sent: 2, failure: null },
      { name: "articles wo", saved: 0, refused: 0, sent: 0, failure: null },
    ]);
  });

  it("goes on with the others when one fails", async () => {
    const failing: TranslationRuns = {
      collect: () => Promise.reject(new Error("Anthropic batches answered 529")),
      submit: () => Promise.resolve({ sent: 0, batchId: null }),
    };
    const calls: string[] = [];
    const reports = await translationPass(
      [
        { name: "articles en", runs: failing },
        { name: "articles wo", runs: runs({ saved: 1 }, 0, calls) },
      ],
      client,
      { model: "m", since: null, limit: 5 },
    );
    expect(reports[0]?.failure).toBe("Anthropic batches answered 529");
    expect(reports[1]).toMatchObject({ saved: 1, failure: null });
    expect(calls).toEqual(["collect", "submit m 5"]);
  });
});
