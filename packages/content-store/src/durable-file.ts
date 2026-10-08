import { mkdir, open, readdir, rename, stat, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Windows refuses to replace a file another process has open for an instant (the
 * API reading the store while a command writes it): the rename is tried again a few
 * times, a little later each time (ERREURS.md, 08/10/2026). Elsewhere it never waits.
 */
const BUSY = new Set(["EPERM", "EACCES", "EBUSY"]);
const RENAME_ATTEMPTS = 8;
const RENAME_DELAY_MS = 25;

async function renamePatiently(
  from: string,
  to: string,
  move: (from: string, to: string) => Promise<void> = rename,
): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await move(from, to);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code ?? "";
      if (!BUSY.has(code) || attempt >= RENAME_ATTEMPTS) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, RENAME_DELAY_MS * attempt));
    }
  }
}

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
export async function writeFileDurably(
  path: string,
  data: string | Uint8Array,
  move?: (from: string, to: string) => Promise<void>,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${String(process.pid)}.tmp`;
  const handle = await open(temp, "w");
  try {
    await handle.writeFile(data);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await renamePatiently(temp, path, move);
}
