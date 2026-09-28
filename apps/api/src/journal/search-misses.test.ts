import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchMisses } from "./search-misses";

let dir: string;
let path: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-search-misses-"));
  path = join(dir, "search-misses.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const at = new Date("2026-09-28T14:35:12Z");

describe("SearchMisses", () => {
  it("adds up the ways of writing a search, and shows it from 3 times on", async () => {
    const misses = await SearchMisses.open(path);
    misses.record("news", "fr", "Bourse  Étudiante", at);
    misses.record("news", "fr", "bourse étudiante", at);
    expect(misses.shown()).toEqual([]);
    misses.record("news", "fr", " BOURSE ÉTUDIANTE ", at);
    expect(misses.shown()).toEqual([
      { area: "news", lang: "fr", query: "bourse étudiante", count: 3, lastOn: "2026-09-28" },
    ]);
  });

  it("keeps searches of each area and language apart", async () => {
    const misses = await SearchMisses.open(path);
    for (let i = 0; i < 3; i += 1) {
      misses.record("news", "fr", "passeport", at);
      misses.record("procedures", "fr", "passeport", at);
    }
    misses.record("news", "wo", "passeport", at);
    expect(misses.shown().map(({ area, lang }) => `${area}:${lang}`)).toEqual([
      "news:fr",
      "procedures:fr",
    ]);
  });

  it("keeps the day only, never the time, and finds its count again after a restart", async () => {
    const misses = await SearchMisses.open(path);
    for (let i = 0; i < 3; i += 1) {
      misses.record("news", "fr", "permis", at);
    }
    await misses.close();
    const saved = await readFile(path, "utf8");
    expect(saved).not.toContain("14:35");
    expect((await SearchMisses.open(path)).shown()[0]?.count).toBe(3);
  });
});
