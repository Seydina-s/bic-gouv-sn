import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import type { z } from "zod";

/**
 * A value kept in a JSON file, for a single API instance: each change reads what
 * the previous one wrote, then writes durably. A missing or damaged file reads as
 * `empty()`.
 */
export class JsonFileState<Schema extends z.ZodType> {
  /** Changes wait for each other. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly schema: Schema,
    private readonly empty: () => z.infer<Schema>,
  ) {}

  private async readNow(): Promise<z.infer<Schema>> {
    try {
      return this.schema.parse(JSON.parse(await readFile(this.path, "utf8")));
    } catch {
      // Nothing saved yet, or damaged: start again.
      return this.empty();
    }
  }

  async read(): Promise<z.infer<Schema>> {
    await this.queue;
    return this.readNow();
  }

  update(change: (value: z.infer<Schema>) => void): Promise<void> {
    const done = this.queue.then(async () => {
      const value = await this.readNow();
      change(value);
      await writeFileDurably(this.path, JSON.stringify(value, null, 2));
    });
    this.queue = done.catch(() => undefined);
    return done;
  }
}
