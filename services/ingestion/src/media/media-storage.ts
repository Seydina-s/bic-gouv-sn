import { mkdir, open, rename, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
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

  /**
   * Durable write: temporary file flushed to disk (fsync), then renamed, so a
   * power cut never leaves a truncated or zeroed file under its final name.
   */
  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${String(process.pid)}.tmp`;
    const handle = await open(temp, "w");
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temp, path);
  }
}
