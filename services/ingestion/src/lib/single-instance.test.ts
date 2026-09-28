import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { acquireLock, isRunning } from "./single-instance";

let dir: string;
let lock: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-lock-"));
  lock = join(dir, "watch.lock");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("acquireLock", () => {
  it("lets one watcher in and refuses a second while the first runs", async () => {
    const first = await acquireLock(lock, 100, () => true);
    expect(first.acquired).toBe(true);
    expect(await acquireLock(lock, 200, () => true)).toEqual({ acquired: false, holder: 100 });
  });

  it("takes over the lock of a watcher that died", async () => {
    await writeFile(lock, "100");
    expect((await acquireLock(lock, 200, () => false)).acquired).toBe(true);
    expect(await readFile(lock, "utf8")).toBe("200");
  });

  it("frees the lock on stop, only if it still holds it", async () => {
    const first = await acquireLock(lock, 100, () => false);
    if (!first.acquired) {
      throw new Error("expected the lock");
    }
    await writeFile(lock, "300");
    await first.release();
    expect(await readFile(lock, "utf8")).toBe("300");
    await writeFile(lock, "100");
    await first.release();
    await expect(readFile(lock, "utf8")).rejects.toThrow();
  });

  it("knows this very process is running", () => {
    expect(isRunning(process.pid)).toBe(true);
  });
});
