import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { mediaKeySchema } from "@bgs/shared-types";

/**
 * Where processed media files live. Local folder today; an S3-compatible bucket
 * behind a CDN later (same interface, keys unchanged).
 */
export interface MediaStorage {
  exists(key: string): Promise<boolean>;
  put(key: string, data: Buffer): Promise<void>;
}

export class FileMediaStorage implements MediaStorage {
  constructor(private readonly root: string) {}

  private pathOf(key: string): string {
    // Keys are validated: no absolute path, no "..", only safe characters.
    return join(this.root, mediaKeySchema.parse(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await access(this.pathOf(key));
      return true;
    } catch {
      return false;
    }
  }

  async put(key: string, data: Buffer): Promise<void> {
    const path = this.pathOf(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
  }
}
