import { readFile, rm, writeFile } from "node:fs/promises";

/** Whether a process with this id is still running (signal 0 only checks). */
export function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM: it exists but belongs to someone else — still running.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export type LockOutcome =
  { acquired: true; release: () => Promise<void> } | { acquired: false; holder: number };

/**
 * One writer at a time on the data files (the store is single-writer): a lock file
 * holding the process id. A lock left by a process that died is taken over.
 */
export async function acquireLock(
  path: string,
  pid: number = process.pid,
  running: (pid: number) => boolean = isRunning,
): Promise<LockOutcome> {
  const holder = Number.parseInt(await readFile(path, "utf8").catch(() => ""), 10);
  if (Number.isInteger(holder) && holder !== pid && running(holder)) {
    return { acquired: false, holder };
  }
  await writeFile(path, String(pid));
  return {
    acquired: true,
    release: async () => {
      const current = await readFile(path, "utf8").catch(() => "");
      if (current === String(pid)) {
        await rm(path, { force: true });
      }
    },
  };
}
