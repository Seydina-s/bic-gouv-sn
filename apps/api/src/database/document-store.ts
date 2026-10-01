import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { z } from "zod";
import type { Database } from "./database";

/**
 * Documents the console changes (notifications, opportunities…), each one whole
 * and validated on the way in and out.
 */
export interface DocumentStore<T extends { id: string }> {
  all(): Promise<T[]>;
  /**
   * Changes the list one writer at a time, across every API instance: two
   * decisions never overwrite each other, and a rule checked inside `change`
   * still holds when the change is written.
   */
  update<R>(change: (documents: T[]) => { next: T[]; result: R }): Promise<R>;
}

/** One validated JSON file, written durably: for a single API instance. */
export class FileDocumentStore<T extends { id: string }> implements DocumentStore<T> {
  private queue: Promise<unknown> = Promise.resolve();
  private readonly fileSchema: z.ZodType<Record<string, unknown>>;

  /** `field`: the file's list, e.g. { schemaVersion: 1, notifications: [...] }. */
  constructor(
    private readonly path: string,
    private readonly schema: z.ZodType<T>,
    private readonly field: string,
  ) {
    this.fileSchema = z.object({ schemaVersion: z.literal(1), [field]: z.array(schema) });
  }

  async all(): Promise<T[]> {
    try {
      const saved = this.fileSchema.parse(JSON.parse(await readFile(this.path, "utf8")));
      return saved[this.field] as T[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  update<R>(change: (documents: T[]) => { next: T[]; result: R }): Promise<R> {
    const run = this.queue.then(async () => {
      const { next, result } = change(await this.all());
      const checked = next.map((one) => this.schema.parse(one));
      await writeFileDurably(
        this.path,
        JSON.stringify({ schemaVersion: 1, [this.field]: checked }, null, 2),
      );
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const rowSchema = z.object({ id: z.string(), data: z.unknown() });

/**
 * PostgreSQL: one row per document in `table` (id, data jsonb). A change reads and
 * writes under one advisory `lock`, in one transaction (SCALE-02).
 */
export class PostgresDocumentStore<T extends { id: string }> implements DocumentStore<T> {
  constructor(
    private readonly database: Database,
    private readonly schema: z.ZodType<T>,
    private readonly table: string,
    private readonly lock: number,
  ) {}

  private parse(rows: unknown[]): T[] {
    return rows.map((row) => this.schema.parse(rowSchema.parse(row).data));
  }

  async all(): Promise<T[]> {
    return this.parse(
      (await this.database.query(`SELECT id, data FROM ${this.table} ORDER BY id`)).rows,
    );
  }

  update<R>(change: (documents: T[]) => { next: T[]; result: R }): Promise<R> {
    return this.database.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock($1)", [this.lock]);
      const before = this.parse((await tx.query(`SELECT id, data FROM ${this.table}`)).rows);
      const { next, result } = change(before);
      const previous = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
      for (const item of next.map((one) => this.schema.parse(one))) {
        const json = JSON.stringify(item);
        if (previous.get(item.id) !== json) {
          await tx.query(
            `INSERT INTO ${this.table} (id, data) VALUES ($1, $2::jsonb)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [item.id, json],
          );
        }
        previous.delete(item.id);
      }
      if (previous.size > 0) {
        await tx.query(`DELETE FROM ${this.table} WHERE id = ANY($1::text[])`, [
          [...previous.keys()],
        ]);
      }
      return result;
    });
  }
}
