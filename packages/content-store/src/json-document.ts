import { readFile } from "node:fs/promises";
import type { Database } from "@bgs/database";
import type { z } from "zod";
import { writeFileDurably } from "./durable-file";

/** What a change decides: the next saved value (none: leave it as it is), and a result. */
export interface DocumentChange<R> {
  next?: unknown;
  result: R;
}

/**
 * One saved JSON value (the procedure themes, the state services, the remote
 * control…), in a file or in PostgreSQL (SCALE-02). Changes take turns: two changes
 * never overwrite each other, across every API instance when in the database.
 */
export interface JsonDocument {
  /** The saved value, undefined when nothing was saved yet. */
  read(): Promise<unknown>;
  update<R>(change: (saved: unknown) => DocumentChange<R>): Promise<R>;
}

/** A JSON file, written durably: for a single writing process. */
export function fileDocument(path: string): JsonDocument {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async (): Promise<unknown> => {
    try {
      return JSON.parse(await readFile(path, "utf8")) as unknown;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return undefined;
      }
      throw error;
    }
  };
  return {
    read,
    update(change) {
      const run = queue.then(async () => {
        const { next, result } = change(await read());
        if (next !== undefined) {
          await writeFileDurably(path, JSON.stringify(next, null, 2));
        }
        return result;
      });
      queue = run.catch(() => undefined);
      return run;
    },
  };
}

/** A document read and changed through its schema, with a value when nothing is saved. */
export class TypedDocument<F> {
  constructor(
    private readonly document: JsonDocument,
    private readonly schema: z.ZodType<F>,
    private readonly empty: F,
  ) {}

  async read(): Promise<F> {
    return this.parse(await this.document.read());
  }

  /** Reads, changes and writes under one lock; the next value is validated first. */
  change<R>(decide: (current: F) => { next?: F; result: R }): Promise<R> {
    return this.document.update((saved) => {
      const { next, result } = decide(this.parse(saved));
      return { next: next === undefined ? undefined : this.schema.parse(next), result };
    });
  }

  private parse(saved: unknown): F {
    return saved === undefined ? this.empty : this.schema.parse(saved);
  }
}

/** One row of `content_documents`, changed under a lock in one transaction. */
export function postgresDocument(database: Database, name: string): JsonDocument {
  const dataOf = (rows: unknown[]): unknown => (rows[0] as { data: unknown } | undefined)?.data;
  return {
    async read() {
      const { rows } = await database.query("SELECT data FROM content_documents WHERE name = $1", [
        name,
      ]);
      return dataOf(rows);
    },
    update(change) {
      return database.transaction(async (tx) => {
        await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`content_documents:${name}`]);
        const { rows } = await tx.query("SELECT data FROM content_documents WHERE name = $1", [
          name,
        ]);
        const { next, result } = change(dataOf(rows));
        if (next !== undefined) {
          await tx.query(
            `INSERT INTO content_documents (name, data) VALUES ($1, $2::jsonb)
             ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data`,
            [name, JSON.stringify(next)],
          );
        }
        return result;
      });
    },
  };
}
