import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const DAY_FOLDER = /^\d{4}-\d{2}-\d{2}$/;

export interface SnapshotOptions {
  /** Files to copy (missing ones are skipped). */
  files: readonly string[];
  /** Folder holding one sub-folder per day (YYYY-MM-DD). */
  backupsDir: string;
  now: Date;
  /** Number of daily copies kept; older ones are deleted. */
  keep: number;
}

export type SnapshotOutcome = "created" | "already-done";

/**
 * Daily safety copy of the data files (DATA-01, after the 25/09/2026 data loss):
 * at most one per day, the last `keep` days kept. The copies sit next to the data
 * on this machine; an off-machine copy is a separate step (hosting, S1-02).
 */
export async function snapshotDaily({
  files,
  backupsDir,
  now,
  keep,
}: SnapshotOptions): Promise<SnapshotOutcome> {
  const day = now.toISOString().slice(0, 10);
  const target = join(backupsDir, day);
  const exists = await stat(target).then(
    () => true,
    () => false,
  );
  if (exists) {
    return "already-done";
  }
  await mkdir(target, { recursive: true });
  for (const file of files) {
    await copyFile(file, join(target, basename(file))).catch((error: unknown) => {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    });
  }
  const days = (await readdir(backupsDir)).filter((name) => DAY_FOLDER.test(name)).sort();
  for (const old of days.slice(0, Math.max(0, days.length - keep))) {
    await rm(join(backupsDir, old), { recursive: true, force: true });
  }
  return "created";
}
