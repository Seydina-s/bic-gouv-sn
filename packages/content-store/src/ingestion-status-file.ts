import { readFile } from "node:fs/promises";
import { ingestionStatusSchema, type IngestionStatus } from "@bgs/shared-types";
import { writeFileDurably } from "./durable-file";

/**
 * Report of the real-time collection, written by the watcher after each pass and
 * read by the API for the administration console. Missing or damaged: null.
 */
export async function readIngestionStatus(path: string): Promise<IngestionStatus | null> {
  try {
    const parsed = ingestionStatusSchema.safeParse(JSON.parse(await readFile(path, "utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeIngestionStatus(path: string, status: IngestionStatus): Promise<void> {
  await writeFileDurably(path, JSON.stringify(status));
}
