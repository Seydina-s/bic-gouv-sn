import {
  errorJournalEntrySchema,
  errorJournalFileSchema,
  type ErrorJournalEntry,
} from "@bgs/shared-types";
import { z } from "zod";
import type { Queryable } from "../database/database";
import { JsonFileState } from "./json-file-state";

/** Groups kept: beyond, the least recent give way (a flood never fills the storage). */
export const MAX_GROUPS = 300;

export function groupKey(entry: Pick<ErrorJournalEntry, "code" | "where">): string {
  return `${entry.code} ${entry.where}`;
}

/**
 * Adds groups to `into`: counts add up, the first and last times widen, and the
 * request id is the latest one. Groups from several instances merge this way.
 */
export function addGroups(
  into: Map<string, ErrorJournalEntry>,
  groups: Iterable<ErrorJournalEntry>,
): void {
  for (const group of groups) {
    const key = groupKey(group);
    const seen = into.get(key);
    const later = seen === undefined || group.lastAt >= seen.lastAt ? group : seen;
    into.set(key, {
      ...group,
      count: (seen?.count ?? 0) + group.count,
      firstAt: seen !== undefined && seen.firstAt < group.firstAt ? seen.firstAt : group.firstAt,
      lastAt: later.lastAt,
      lastRequestId: later.lastRequestId,
    });
  }
}

/** The `max` most recent groups, latest first. */
export function latestGroups(
  groups: Iterable<ErrorJournalEntry>,
  max = MAX_GROUPS,
): ErrorJournalEntry[] {
  return [...groups].sort((a, b) => b.lastAt.localeCompare(a.lastAt)).slice(0, max);
}

/** Where the errors the API answered are journaled. */
export interface ErrorJournalStore {
  /** Adds these groups to the kept ones, then keeps only the most recent. */
  add(groups: readonly ErrorJournalEntry[]): Promise<void>;
  all(): Promise<ErrorJournalEntry[]>;
}

/** A JSON file: for a single API instance (no DATABASE_URL). */
export class FileErrorJournalStore implements ErrorJournalStore {
  private readonly file: JsonFileState<typeof errorJournalFileSchema>;

  constructor(path: string) {
    this.file = new JsonFileState(path, errorJournalFileSchema, () => ({
      schemaVersion: 1 as const,
      entries: [],
    }));
  }

  add(groups: readonly ErrorJournalEntry[]): Promise<void> {
    return this.file.update((saved) => {
      const all = new Map<string, ErrorJournalEntry>();
      addGroups(all, saved.entries);
      addGroups(all, groups);
      saved.entries = latestGroups(all.values());
    });
  }

  async all(): Promise<ErrorJournalEntry[]> {
    return (await this.file.read()).entries;
  }
}

/** One statement; rows in a fixed order, so two instances never lock each other. */
const ADD_SQL = `
  INSERT INTO error_journal AS kept (code, place, count, first_at, last_at, last_request_id)
  SELECT d.code, d.place, d.count, d.first_at, d.last_at, d.last_request_id
  FROM unnest($1::text[], $2::text[], $3::bigint[], $4::text[], $5::text[], $6::text[])
    AS d(code, place, count, first_at, last_at, last_request_id)
  ORDER BY d.code, d.place
  ON CONFLICT (code, place) DO UPDATE SET
    count = kept.count + EXCLUDED.count,
    first_at = least(kept.first_at, EXCLUDED.first_at),
    last_at = greatest(kept.last_at, EXCLUDED.last_at),
    last_request_id = CASE WHEN EXCLUDED.last_at >= kept.last_at
      THEN EXCLUDED.last_request_id ELSE kept.last_request_id END`;

const KEEP_LATEST_SQL = `
  DELETE FROM error_journal WHERE (code, place) IN (
    SELECT code, place FROM error_journal ORDER BY last_at DESC OFFSET $1
  )`;

const rowSchema = z.object({
  code: z.string(),
  place: z.string(),
  count: z.coerce.number(),
  first_at: z.string(),
  last_at: z.string(),
  last_request_id: z.string().nullable(),
});

/** PostgreSQL: every API instance journals into the same groups (SCALE-02). */
export class PostgresErrorJournalStore implements ErrorJournalStore {
  constructor(private readonly database: Queryable) {}

  async add(groups: readonly ErrorJournalEntry[]): Promise<void> {
    if (groups.length === 0) {
      return;
    }
    await this.database.query(ADD_SQL, [
      groups.map((group) => group.code),
      groups.map((group) => group.where),
      groups.map((group) => group.count),
      groups.map((group) => group.firstAt),
      groups.map((group) => group.lastAt),
      groups.map((group) => group.lastRequestId),
    ]);
    await this.database.query(KEEP_LATEST_SQL, [MAX_GROUPS]);
  }

  async all(): Promise<ErrorJournalEntry[]> {
    const { rows } = await this.database.query(
      "SELECT code, place, count, first_at, last_at, last_request_id FROM error_journal",
    );
    return rows.map((row) => {
      const parsed = rowSchema.parse(row);
      return errorJournalEntrySchema.parse({
        code: parsed.code,
        where: parsed.place,
        count: parsed.count,
        firstAt: parsed.first_at,
        lastAt: parsed.last_at,
        lastRequestId: parsed.last_request_id,
      });
    });
  }
}
