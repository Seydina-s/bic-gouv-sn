import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

/** Whether a process with this id is still running (signal 0 only checks). */
function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists but belongs to someone else — still running.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export interface WriteLockOptions {
  /** Longest wait for another writer before giving up. */
  timeoutMs?: number;
  /** A lock older than this is left by a writer that died mid-write: taken over. */
  staleMs?: number;
  running?: (pid: number) => boolean;
}

const RETRY_DELAY_MS = 50;

/** Removes the lock when its holder died, or when it is older than any real write. */
async function clearIfStale(
  path: string,
  staleMs: number,
  running: (pid: number) => boolean,
): Promise<void> {
  const [holder, info] = await Promise.all([
    readFile(path, "utf8").catch(() => ""),
    stat(path).catch(() => null),
  ]);
  const pid = Number.parseInt(holder, 10);
  const dead = Number.isInteger(pid) && !running(pid);
  if (info !== null && (dead || Date.now() - info.mtimeMs > staleMs)) {
    await rm(path, { force: true });
  }
}

/**
 * Runs `write` while holding `path`, a lock file created exclusively: one read-modify-
 * write at a time on a data file, across processes (the collection, the voice
 * recordings, the API). Without it, two writers reading the same version would each
 * write their own, and one change would be lost (ERREURS.md, 10/10/2026).
 */
export async function withWriteLock<T>(
  path: string,
  write: () => Promise<T>,
  { timeoutMs = 60_000, staleMs = 120_000, running = isRunning }: WriteLockOptions = {},
): Promise<T> {
  await mkdir(dirname(path), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const handle = await open(path, "wx");
      try {
        await handle.writeFile(String(process.pid));
      } finally {
        await handle.close();
      }
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() >= deadline) {
        throw new Error(`${path}: another writer kept the lock for ${String(timeoutMs)} ms`, {
          cause: error,
        });
      }
      await clearIfStale(path, staleMs, running);
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  try {
    return await write();
  } finally {
    await rm(path, { force: true });
  }
}
