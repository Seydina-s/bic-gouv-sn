import type { Database, Queryable } from "@bgs/database";
import type { z } from "zod";
import type { SaveOutcome, Versioned, VersionedEntry } from "./versioned-json-store";

/** A table of versioned items, its history table, and the columns lists use. */
export interface VersionedTableSpec<T extends Versioned> {
  /** Table names, fixed in the code (never built from input). */
  table: string;
  historyTable: string;
  schema: z.ZodType<T>;
  /** Columns derived from the item, besides id, version, content_hash and data. */
  columns: readonly string[];
  /** Their values for one item, in the same order. */
  values: (item: T) => unknown[];
}

const dataRow = (row: unknown): unknown => (row as { data: unknown }).data;

/**
 * PostgreSQL counterpart of VersionedJsonStore (SCALE-02): the current version of
 * each item in `table`, every previous one in `historyTable`, validated whole on
 * the way in and out. A changed content fingerprint makes a new version; nothing is
 * overwritten silently. Writes on one item take turns across every instance.
 */
export class PostgresVersionedTable<T extends Versioned> {
  constructor(
    private readonly database: Database,
    private readonly spec: VersionedTableSpec<T>,
  ) {}

  parse(rows: readonly unknown[]): T[] {
    return rows.map((row) => this.spec.schema.parse(dataRow(row)));
  }

  async get(id: string): Promise<T | null> {
    const { rows } = await this.database.query(
      `SELECT data FROM ${this.spec.table} WHERE id = $1`,
      [id],
    );
    return this.parse(rows)[0] ?? null;
  }

  async history(id: string): Promise<T[]> {
    const { rows } = await this.database.query(
      `SELECT data FROM ${this.spec.historyTable} WHERE id = $1 ORDER BY version`,
      [id],
    );
    return this.parse(rows);
  }

  /** Saves a new version only when the content fingerprint changed. */
  save(item: T): Promise<SaveOutcome> {
    return this.database.transaction(async (tx) => {
      const existing = await this.lockCurrent(tx, item.id);
      if (existing?.contentHash === item.contentHash) {
        return "unchanged";
      }
      if (existing !== null) {
        await tx.query(
          `INSERT INTO ${this.spec.historyTable} (id, version, data) VALUES ($1, $2, $3::jsonb)`,
          [existing.id, existing.version, JSON.stringify(existing)],
        );
      }
      await this.write(tx, { ...item, version: (existing?.version ?? 0) + 1 });
      return existing === null ? "created" : "updated";
    });
  }

  /**
   * Copies an item with its whole history as they are, version numbers included
   * (moving from the files, SCALE-02). An item already in the table is left
   * untouched: running the copy again changes nothing.
   */
  importEntry(entry: VersionedEntry<T>): Promise<"imported" | "present"> {
    return this.database.transaction(async (tx) => {
      if ((await this.lockCurrent(tx, entry.current.id)) !== null) {
        return "present";
      }
      for (const previous of entry.history.map((item) => this.spec.schema.parse(item))) {
        await tx.query(
          `INSERT INTO ${this.spec.historyTable} (id, version, data) VALUES ($1, $2, $3::jsonb)
           ON CONFLICT (id, version) DO NOTHING`,
          [previous.id, previous.version, JSON.stringify(previous)],
        );
      }
      await this.write(tx, entry.current);
      return "imported";
    });
  }

  /** Replaces the current version in place (enrichments such as images). */
  replaceCurrent(id: string, update: (current: T) => T): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const current = await this.lockCurrent(tx, id);
      if (current === null) {
        return false;
      }
      await this.write(tx, update(current));
      return true;
    });
  }

  /** The current version, the item locked until the transaction ends (even if new). */
  private async lockCurrent(tx: Queryable, id: string): Promise<T | null> {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${this.spec.table}:${id}`]);
    const { rows } = await tx.query(`SELECT data FROM ${this.spec.table} WHERE id = $1`, [id]);
    return this.parse(rows)[0] ?? null;
  }

  private async write(tx: Queryable, item: T): Promise<void> {
    const checked = this.spec.schema.parse(item);
    const names = ["id", "version", "content_hash", "data", ...this.spec.columns];
    const values = [
      checked.id,
      checked.version,
      checked.contentHash,
      JSON.stringify(checked),
      ...this.spec.values(checked),
    ];
    const placeholders = names.map((name, i) =>
      name === "data" ? `$${String(i + 1)}::jsonb` : `$${String(i + 1)}`,
    );
    const updates = names
      .filter((name) => name !== "id")
      .map((name) => `${name} = EXCLUDED.${name}`);
    await tx.query(
      `INSERT INTO ${this.spec.table} (${names.join(", ")}) VALUES (${placeholders.join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${updates.join(", ")}`,
      values,
    );
  }
}
