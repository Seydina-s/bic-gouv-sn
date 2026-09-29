import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { usageFileSchema, type UsageFile } from "@bgs/shared-types";
import { z } from "zod";
import type { Queryable } from "../database/database";
import {
  addUsage,
  emptyUsage,
  forgetDaysBefore,
  LASTING_METRICS,
  MAX_ARTICLES_PER_DAY,
  rowsToUsage,
  usageToRows,
} from "./usage-counts";

/** Where the anonymous usage counters are kept. */
export interface UsageStore {
  /** Adds these counts to the kept ones, then forgets the days before `oldestDay`. */
  add(delta: UsageFile, oldestDay: string): Promise<void>;
  /** The counts from `fromDay` on (weeks and months: all), and the first day known. */
  load(fromDay: string): Promise<{ usage: UsageFile; since: string | null }>;
}

function firstDay(usage: UsageFile): string | null {
  return Object.keys(usage.days).sort()[0] ?? null;
}

/** A JSON file: for a single API instance (no DATABASE_URL). */
export class FileUsageStore implements UsageStore {
  /** Additions wait for each other: each one reads what the previous one wrote. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  private async read(): Promise<UsageFile> {
    try {
      return usageFileSchema.parse(JSON.parse(await readFile(this.path, "utf8")));
    } catch {
      // Nothing saved yet, or damaged: the counts start again.
      return emptyUsage();
    }
  }

  add(delta: UsageFile, oldestDay: string): Promise<void> {
    const done = this.queue.then(async () => {
      const usage = await this.read();
      addUsage(usage, delta);
      forgetDaysBefore(usage, oldestDay);
      await writeFileDurably(this.path, JSON.stringify(usage, null, 2));
    });
    this.queue = done.catch(() => undefined);
    return done;
  }

  async load(fromDay: string): Promise<{ usage: UsageFile; since: string | null }> {
    await this.queue;
    const usage = await this.read();
    const since = firstDay(usage);
    forgetDaysBefore(usage, fromDay);
    return { usage, since };
  }
}

/**
 * Adds each number to the kept one, in one statement. A new article is counted only
 * while the day has fewer than the maximum (a flood of made-up identifiers stays
 * bounded). Rows go in a fixed order, so two instances never lock each other.
 */
const ADD_SQL = `
  INSERT INTO usage_counts AS kept (period, metric, name, count)
  SELECT d.period, d.metric, d.name, d.count
  FROM unnest($1::text[], $2::text[], $3::text[], $4::bigint[]) AS d(period, metric, name, count)
  WHERE d.metric NOT IN ('reads', 'listens')
    OR EXISTS (
      SELECT 1 FROM usage_counts e
      WHERE e.period = d.period AND e.metric = d.metric AND e.name = d.name
    )
    OR (
      SELECT count(*) FROM usage_counts e WHERE e.period = d.period AND e.metric = d.metric
    ) < $5
  ORDER BY d.period, d.metric, d.name
  ON CONFLICT (period, metric, name) DO UPDATE SET count = kept.count + EXCLUDED.count`;

const rowSchema = z.object({
  period: z.string(),
  metric: z.string(),
  name: z.string(),
  count: z.coerce.number().int().nonnegative(),
});
const sinceSchema = z.object({ since: z.string().nullable() });

/** PostgreSQL: every API instance adds to the same numbers (SCALE-02). */
export class PostgresUsageStore implements UsageStore {
  constructor(private readonly database: Queryable) {}

  async add(delta: UsageFile, oldestDay: string): Promise<void> {
    const rows = usageToRows(delta);
    if (rows.length > 0) {
      await this.database.query(ADD_SQL, [
        rows.map((row) => row.period),
        rows.map((row) => row.metric),
        rows.map((row) => row.name),
        rows.map((row) => row.count),
        MAX_ARTICLES_PER_DAY,
      ]);
    }
    await this.database.query(
      "DELETE FROM usage_counts WHERE period < $1 AND metric <> ALL($2::text[])",
      [oldestDay, LASTING_METRICS],
    );
  }

  async load(fromDay: string): Promise<{ usage: UsageFile; since: string | null }> {
    const { rows } = await this.database.query(
      `SELECT period, metric, name, count FROM usage_counts
       WHERE period >= $1 OR metric = ANY($2::text[])`,
      [fromDay, LASTING_METRICS],
    );
    const first = await this.database.query(
      "SELECT min(period) AS since FROM usage_counts WHERE metric = 'active'",
    );
    return {
      usage: rowsToUsage(rows.map((row) => rowSchema.parse(row))),
      since: sinceSchema.parse(first.rows[0]).since,
    };
  }
}
