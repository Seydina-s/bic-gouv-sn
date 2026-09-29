import { mkdir, open, readdir, rename, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

/** A temporary file of writeFileDurably: "<name>.<process id>.tmp". */
const TEMP_FILE = /\.\d+\.tmp$/;

/**
 * Removes the temporary files a write interrupted by a crash left in `folder`
 * (ERREURS.md, 29/09/2026), only when older than `olderThanMs`: a write still in
 * progress is never touched. Returns how many were removed.
 */
export async function removeStaleTemps(
  folder: string,
  olderThanMs: number,
  now = Date.now(),
): Promise<number> {
  let removed = 0;
  for (const name of await readdir(folder).catch(() => [])) {
    if (!TEMP_FILE.test(name)) {
      continue;
    }
    const path = join(folder, name);
    const info = await stat(path).catch(() => null);
    if (info?.isFile() === true && now - info.mtimeMs > olderThanMs) {
      await unlink(path).catch(() => undefined);
      removed += 1;
    }
  }
  return removed;
}

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
