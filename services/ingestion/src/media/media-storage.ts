import { stat } from "node:fs/promises";
import { join } from "node:path";
import { writeFileDurably } from "@bgs/content-store";
import { mediaKeySchema } from "@bgs/shared-types";

/**
 * Where processed media files live. Local folder today; an S3-compatible bucket
 * behind a CDN later (same interface, keys unchanged).
 */
export interface MediaStorage {
  /** Size in bytes of a stored file, or null when it does not exist. */
  size(key: string): Promise<number | null>;
  put(key: string, data: Buffer): Promise<void>;
}

export class FileMediaStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  private pathOf(key: string): string {
    // Keys are validated: no absolute path, no "..", only safe characters.
    return join(this.root, mediaKeySchema.parse(key));
  }

  async size(key: string): Promise<number | null> {
    try {
      return (await stat(this.pathOf(key))).size;
    } catch {
      return null;
    }
  }

  /** Durable write: never a truncated or zeroed file under its final name. */
  async put(key: string, data: Buffer): Promise<void> {
    await writeFileDurably(this.pathOf(key), data);
  }
}
