import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { snapshotDaily } from "./daily-snapshot";

describe("snapshotDaily", () => {
  let dir: string;
  let backupsDir: string;
  let data: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-backup-"));
    backupsDir = join(dir, "backups");
    data = join(dir, "news.json");
    await writeFile(data, '{"articles":{}}');
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("copies the data once per day, skipping missing files", async () => {
    const options = {
      files: [data, join(dir, "absent.json")],
      backupsDir,
      now: new Date("2026-09-26T10:00:00Z"),
      keep: 7,
    };
    expect(await snapshotDaily(options)).toBe("created");
    expect(await readFile(join(backupsDir, "2026-09-26", "news.json"), "utf8")).toBe(
      '{"articles":{}}',
    );
    expect(await snapshotDaily({ ...options, now: new Date("2026-09-26T22:00:00Z") })).toBe(
      "already-done",
    );
  });

  it("keeps only the last days, and never touches other folders", async () => {
    await mkdir(join(backupsDir, "notes"), { recursive: true });
    for (const day of ["2026-09-20", "2026-09-21", "2026-09-22"]) {
      await mkdir(join(backupsDir, day), { recursive: true });
    }
    await snapshotDaily({
      files: [data],
      backupsDir,
      now: new Date("2026-09-23T08:00:00Z"),
      keep: 2,
    });
    expect((await readdir(backupsDir)).sort()).toEqual(["2026-09-22", "2026-09-23", "notes"]);
  });
});
