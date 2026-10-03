import { ingestionStatusSchema, type IngestionStatus } from "@bgs/shared-types";
import type { JsonDocument } from "./json-document";

/**
 * Report of the real-time collection, written by the watcher after each pass and
 * read by the API for the administration console, in a file or in PostgreSQL
 * (SCALE-02). Missing or damaged: null.
 */
export async function readIngestionStatus(document: JsonDocument): Promise<IngestionStatus | null> {
  try {
    const parsed = ingestionStatusSchema.safeParse(await document.read());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeIngestionStatus(
  document: JsonDocument,
  status: IngestionStatus,
): Promise<void> {
  await document.update(() => ({ next: status, result: undefined }));
}
