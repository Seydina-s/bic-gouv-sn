import { mkdir, open, rename } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Writes a temporary file, forces it onto the disk (fsync), then renames it over
 * `path`: readers see the old content or the new one, never a partial file. Without
 * the fsync, a power cut can leave a renamed file full of zeros (ERREURS.md,
 * 25/09/2026). Creates the folder when needed.
 */
export async function writeFileDurably(path: string, data: string | Uint8Array): Promise<void> {
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
