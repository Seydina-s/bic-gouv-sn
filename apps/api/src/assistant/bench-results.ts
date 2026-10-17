import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { AssistantBench } from "@bgs/shared-types";
import { z } from "zod";
import { weaknessSchema } from "./bench";

/*
 * The bench's results as the console shows them (AST-30f): each run is kept by its
 * date next to the data, with the known weaknesses (assistant-bench.ts writes them).
 */

/** Where the bench keeps its runs and weaknesses, next to the news store. */
export function benchFolder(newsStorePath: string): string {
  return join(dirname(newsStorePath), "assistant", "bench");
}

export const WEAKNESSES_FILE = "weaknesses.json";
/** Runs shown in the trend. */
const HISTORY = 8;
const RUN_FILE = /^\d{4}-\d{2}-\d{2}\.json$/;

const runSchema = z.object({
  today: z.iso.date(),
  summary: z.object({
    cases: z.int().nonnegative(),
    passed: z.int().nonnegative(),
    invented: z.int().nonnegative(),
    byKind: z.record(z.string(), z.object({ cases: z.int(), passed: z.int() })),
  }),
  costMicrodollars: z.number().nonnegative(),
  /** Absent from the runs before 17/10/2026, 23 h. */
  fixed: z.int().nonnegative().optional(),
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

/** The runs and weaknesses kept in `folder`; an empty bench when nothing is there yet. */
export async function readBenchResults(folder: string): Promise<AssistantBench> {
  const names = (await readdir(folder).catch(() => [] as string[]))
    .filter((name) => RUN_FILE.test(name))
    .sort();
  const runs = (
    await Promise.all(
      names.slice(-HISTORY).map(async (name) => {
        const parsed = runSchema.safeParse(await readJson(join(folder, name)).catch(() => null));
        return parsed.success ? [parsed.data] : [];
      }),
    )
  ).flat();
  const weaknesses = z
    .array(weaknessSchema)
    .safeParse(await readJson(join(folder, WEAKNESSES_FILE)).catch(() => []));
  const last = runs.at(-1);
  return {
    latest:
      last === undefined
        ? null
        : {
            date: last.today,
            cases: last.summary.cases,
            passed: last.summary.passed,
            invented: last.summary.invented,
            costUsd: last.costMicrodollars / 1_000_000,
            byKind: Object.entries(last.summary.byKind).map(([kind, score]) => ({
              kind,
              ...score,
            })),
            fixed: last.fixed ?? 0,
          },
    history: runs.map((run) => ({
      date: run.today,
      cases: run.summary.cases,
      passed: run.summary.passed,
    })),
    weaknesses: (weaknesses.success ? weaknesses.data : []).map(
      ({ case: c, since, reason, passedInARow }) => ({
        question: c.question,
        kind: c.kind,
        since,
        reason,
        passedInARow,
      }),
    ),
  };
}
