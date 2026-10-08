import { randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { removeStaleTemps, writeFileDurably } from "./durable-file";

const HOUR_MS = 60 * 60 * 1000;

async function folder(): Promise<string> {
  const path = join(tmpdir(), "bgs-durable", randomUUID());
  await mkdir(path, { recursive: true });
  return path;
}

describe("durable writes", () => {
  it("replace the file whole, leaving no temporary file", async () => {
    const dir = await folder();
    await writeFileDurably(join(dir, "news.json"), "un");
    await writeFileDurably(join(dir, "news.json"), "deux");
    expect(await readFile(join(dir, "news.json"), "utf8")).toBe("deux");
    expect(await readdir(dir)).toEqual(["news.json"]);
  });

  it("clean up only the old leftovers of an interrupted write", async () => {
    const dir = await folder();
    const now = Date.now();
    await writeFile(join(dir, "news.json.16952.tmp"), "reste");
    const old = new Date(now - 2 * HOUR_MS);
    await utimes(join(dir, "news.json.16952.tmp"), old, old);
    // Still being written by another process: too recent to be touched.
    await writeFile(join(dir, "news.json.20000.tmp"), "en cours");
    await writeFile(join(dir, "news.json"), "données");
    await writeFile(join(dir, "notes.tmp"), "autre chose");
    expect(await removeStaleTemps(dir, HOUR_MS, now)).toBe(1);
    expect((await readdir(dir)).sort()).toEqual(["news.json", "news.json.20000.tmp", "notes.tmp"]);
  });

  it("try again while another process holds the file, and give up on a real error", async () => {
    const path = join(await folder(), "busy.json");
    let refusals = 2;
    const busyThenFree = async (from: string, to: string) => {
      if (refusals > 0) {
        refusals -= 1;
        throw Object.assign(new Error("busy"), { code: "EPERM" });
      }
      await rename(from, to);
    };
    await writeFileDurably(path, "{}", busyThenFree);
    expect(await readFile(path, "utf8")).toBe("{}");
    const broken = () => Promise.reject(Object.assign(new Error("gone"), { code: "ENOENT" }));
    await expect(writeFileDurably(path, "{}", broken)).rejects.toThrow("gone");
  });

  it("find nothing to clean in a folder that does not exist", async () => {
    expect(await removeStaleTemps(join(tmpdir(), "bgs-durable", randomUUID()), HOUR_MS)).toBe(0);
  });
});
