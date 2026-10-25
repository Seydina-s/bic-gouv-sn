import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assistantBenchSchema } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  benchFolder,
  FLAG_RECHECKS_FILE,
  readBenchResults,
  readFlagRechecks,
  WEAKNESSES_FILE,
} from "./bench-results";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-bench-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

// Placeholder runs, as assistant-bench.ts writes them.
function run(today: string, passed: number, fixed?: number) {
  return JSON.stringify({
    today,
    model: "modele-de-test",
    summary: {
      cases: 10,
      passed,
      invented: 0,
      byKind: { procedure: { cases: 4, passed: 4 }, trap: { cases: 6, passed: passed - 4 } },
    },
    costMicrodollars: 400_000,
    ...(fixed === undefined ? {} : { fixed }),
    verdicts: [],
  });
}

describe("the bench's results for the console", () => {
  it("give the latest run by kind, the trend oldest first, and the known weaknesses", async () => {
    await writeFile(join(dir, "2026-10-10.json"), run("2026-10-10", 7));
    await writeFile(join(dir, "2026-10-17.json"), run("2026-10-17", 9, 2));
    await writeFile(join(dir, "notes.txt"), "pas un passage");
    await writeFile(
      join(dir, WEAKNESSES_FILE),
      JSON.stringify([
        {
          case: {
            id: "w",
            kind: "search-citizen",
            question: "dernier cm",
            lang: "fr",
            accepted: ["answered"],
          },
          since: "2026-10-10",
          reason: "N'a pas cité la page attendue.",
          passedInARow: 1,
        },
      ]),
    );
    const bench = assistantBenchSchema.parse(await readBenchResults(dir));
    expect(bench.latest).toMatchObject({ date: "2026-10-17", passed: 9, costUsd: 0.4, fixed: 2 });
    expect(bench.latest?.byKind).toContainEqual({ kind: "procedure", cases: 4, passed: 4 });
    expect(bench.history.map((score) => score.date)).toEqual(["2026-10-10", "2026-10-17"]);
    expect(bench.weaknesses).toEqual([
      {
        question: "dernier cm",
        kind: "search-citizen",
        since: "2026-10-10",
        reason: "N'a pas cité la page attendue.",
        passedInARow: 1,
      },
    ]);
  });

  it("are empty before the first run, and next to the news store", async () => {
    expect(await readBenchResults(join(dir, "absent"))).toEqual({
      latest: null,
      history: [],
      weaknesses: [],
    });
    expect(benchFolder(join(dir, "news.json"))).toBe(join(dir, "assistant", "bench"));
  });

  it("give the flagged questions asked again, none when the file is absent or unreadable", async () => {
    expect(await readFlagRechecks(join(dir, "absent"))).toEqual({});
    const recheck = { askedOn: "2026-11-01", status: "not_found", answer: null, sources: [] };
    const id = "00000000-0000-4000-8000-00000000000a";
    await writeFile(join(dir, FLAG_RECHECKS_FILE), JSON.stringify({ [id]: recheck }));
    expect(await readFlagRechecks(dir)).toEqual({ [id]: recheck });
    await writeFile(join(dir, FLAG_RECHECKS_FILE), JSON.stringify({ [id]: { askedOn: 1 } }));
    expect(await readFlagRechecks(dir)).toEqual({});
  });
});
