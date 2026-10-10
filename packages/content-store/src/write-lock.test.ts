import { mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { withWriteLock } from "./write-lock";

let dir: string;
let lock: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-lock-"));
  lock = join(dir, "items.json.write.lock");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("withWriteLock", () => {
  it("lets one writer at a time in, and frees the lock even when the write fails", async () => {
    const order: string[] = [];
    const slow = (name: string) =>
      withWriteLock(lock, async () => {
        order.push(`${name} in`);
        await new Promise((resolve) => setTimeout(resolve, 30));
        order.push(`${name} out`);
      });
    await Promise.all([slow("a"), slow("b")]);
    // Either may go first; the other never starts before the first has finished.
    expect(order[0]?.split(" ")[0]).toBe(order[1]?.split(" ")[0]);
    expect(order.map((step) => step.split(" ")[1])).toEqual(["in", "out", "in", "out"]);
    await expect(withWriteLock(lock, () => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
    await expect(stat(lock)).rejects.toThrow();
  });

  it("takes over a lock left by a writer that died", async () => {
    await writeFile(lock, "999999");
    const result = await withWriteLock(lock, () => Promise.resolve("ok"), { running: () => false });
    expect(result).toBe("ok");
  });

  it("takes over a lock older than any real write", async () => {
    await writeFile(lock, String(process.pid));
    const old = new Date(Date.now() - 10 * 60_000);
    await utimes(lock, old, old);
    expect(await withWriteLock(lock, () => Promise.resolve("ok"))).toBe("ok");
  });

  it("gives up when a living writer keeps the lock too long", async () => {
    await writeFile(lock, String(process.pid));
    await expect(
      withWriteLock(lock, () => Promise.resolve("never"), { timeoutMs: 120 }),
    ).rejects.toThrow("another writer kept the lock");
  });
});
