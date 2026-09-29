import {
  searchMissesFileSchema,
  searchMissSchema,
  type Lang,
  type SearchArea,
  type SearchMiss,
} from "@bgs/shared-types";
import { z } from "zod";
import type { Queryable } from "../database/database";
import { JsonFileState } from "./json-file-state";

/** Distinct searches kept: beyond, the least searched give way (bounded storage). */
export const MAX_QUERIES = 2000;

export function missKey(area: SearchArea, lang: Lang, query: string): string {
  return `${area}|${lang}|${query}`;
}

/** Adds counts to `into`, keeping the latest day: counts from several instances add up. */
export function addMisses(into: Map<string, SearchMiss>, misses: Iterable<SearchMiss>): void {
  for (const miss of misses) {
    const key = missKey(miss.area, miss.lang, miss.query);
    const seen = into.get(key);
    into.set(key, {
      ...miss,
      count: (seen?.count ?? 0) + miss.count,
      lastOn: seen !== undefined && seen.lastOn > miss.lastOn ? seen.lastOn : miss.lastOn,
    });
  }
}

/** The `max` most searched, the most recent first among equals. */
export function mostSearched(misses: Iterable<SearchMiss>, max = MAX_QUERIES): SearchMiss[] {
  return [...misses]
    .sort((a, b) => b.count - a.count || b.lastOn.localeCompare(a.lastOn))
    .slice(0, max);
}

/** Where the searches that found nothing are counted. */
export interface SearchMissStore {
  /** Adds these counts to the kept ones, then keeps only the most searched. */
  add(misses: readonly SearchMiss[]): Promise<void>;
  all(): Promise<SearchMiss[]>;
}

/** A JSON file: for a single API instance (no DATABASE_URL). */
export class FileSearchMissStore implements SearchMissStore {
  private readonly file: JsonFileState<typeof searchMissesFileSchema>;

  constructor(path: string) {
    this.file = new JsonFileState(path, searchMissesFileSchema, () => ({
      schemaVersion: 1 as const,
      entries: [],
    }));
  }

  add(misses: readonly SearchMiss[]): Promise<void> {
    return this.file.update((saved) => {
      const all = new Map<string, SearchMiss>();
      addMisses(all, saved.entries);
      addMisses(all, misses);
      saved.entries = mostSearched(all.values());
    });
  }

  async all(): Promise<SearchMiss[]> {
    return (await this.file.read()).entries;
  }
}

/** One statement; rows in a fixed order, so two instances never lock each other. */
const ADD_SQL = `
  INSERT INTO search_misses AS kept (area, lang, query, count, last_on)
  SELECT d.area, d.lang, d.query, d.count, d.last_on
  FROM unnest($1::text[], $2::text[], $3::text[], $4::bigint[], $5::text[])
    AS d(area, lang, query, count, last_on)
  ORDER BY d.area, d.lang, d.query
  ON CONFLICT (area, lang, query) DO UPDATE SET
    count = kept.count + EXCLUDED.count,
    last_on = greatest(kept.last_on, EXCLUDED.last_on)`;

const KEEP_MOST_SEARCHED_SQL = `
  DELETE FROM search_misses WHERE (area, lang, query) IN (
    SELECT area, lang, query FROM search_misses
    ORDER BY count DESC, last_on DESC OFFSET $1
  )`;

const rowSchema = z.object({
  area: z.string(),
  lang: z.string(),
  query: z.string(),
  count: z.coerce.number(),
  last_on: z.string(),
});

/** PostgreSQL: every API instance adds to the same counts (SCALE-02). */
export class PostgresSearchMissStore implements SearchMissStore {
  constructor(private readonly database: Queryable) {}

  async add(misses: readonly SearchMiss[]): Promise<void> {
    if (misses.length === 0) {
      return;
    }
    await this.database.query(ADD_SQL, [
      misses.map((miss) => miss.area),
      misses.map((miss) => miss.lang),
      misses.map((miss) => miss.query),
      misses.map((miss) => miss.count),
      misses.map((miss) => miss.lastOn),
    ]);
    await this.database.query(KEEP_MOST_SEARCHED_SQL, [MAX_QUERIES]);
  }

  async all(): Promise<SearchMiss[]> {
    const { rows } = await this.database.query(
      "SELECT area, lang, query, count, last_on FROM search_misses",
    );
    return rows.map((row) => {
      const { last_on: lastOn, ...rest } = rowSchema.parse(row);
      return searchMissSchema.parse({ ...rest, lastOn });
    });
  }
}
