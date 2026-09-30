import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { z } from "zod";
import type { Queryable } from "../database/database";

/**
 * Settings the console changes for every API instance at once (the pause of the
 * automatic notifications, for now). Values are validated by whoever reads them.
 */
export interface SettingStore {
  /** The value saved under `key`, or undefined. */
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  settings: z.record(z.string(), z.unknown()),
});

/** One JSON file, written durably: for a single API instance (no DATABASE_URL). */
export class FileSettingStore implements SettingStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  private async all(): Promise<Record<string, unknown>> {
    try {
      return fileSchema.parse(JSON.parse(await readFile(this.path, "utf8"))).settings;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      // Damaged: refused, never read as "nothing set" (a pause would be lost).
      throw error;
    }
  }

  async get(key: string): Promise<unknown> {
    await this.queue;
    return (await this.all())[key];
  }

  set(key: string, value: unknown): Promise<void> {
    const run = this.queue.then(async () => {
      const settings = { ...(await this.all()), [key]: value };
      await writeFileDurably(this.path, JSON.stringify({ schemaVersion: 1, settings }, null, 2));
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const rowSchema = z.object({ value: z.unknown() });

/** PostgreSQL: one row per setting, shared by every API instance (SCALE-02). */
export class PostgresSettingStore implements SettingStore {
  constructor(private readonly database: Queryable) {}

  async get(key: string): Promise<unknown> {
    const { rows } = await this.database.query("SELECT value FROM settings WHERE key = $1", [key]);
    return rows[0] === undefined ? undefined : rowSchema.parse(rows[0]).value;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.database.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }
}
