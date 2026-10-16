import { statfs } from "node:fs/promises";
import type { DiskSpace } from "@bgs/shared-types";

/** Free and total space of the disk holding `path`; undefined when it cannot be read. */
export async function diskSpace(path: string): Promise<DiskSpace | undefined> {
  try {
    const stats = await statfs(path);
    return { freeBytes: stats.bavail * stats.bsize, totalBytes: stats.blocks * stats.bsize };
  } catch {
    return undefined;
  }
}
