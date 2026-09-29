import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SearchMiss } from "@bgs/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../database/database";
import { testDatabases } from "../testing/database";
import {
  FileSearchMissStore,
  MAX_QUERIES,
  PostgresSearchMissStore,
  type SearchMissStore,
} from "./search-miss-store";
import { SearchMisses } from "./search-misses";

let cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

/** Two instances' view of the same counts. */
type Pair = () => Promise<[SearchMissStore, SearchMissStore]>;

const pairs: [string, Pair][] = [
  [
    "in a file",
    () => {
      const path = join(tmpdir(), "bgs-search-misses", `${randomUUID()}.json`);
      return Promise.resolve([new FileSearchMissStore(path), new FileSearchMissStore(path)]);
    },
  ],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      return [new PostgresSearchMissStore(database), new PostgresSearchMissStore(database)];
    },
  ]),
];

const miss = (query: string, count: number, lastOn = "2026-09-29"): SearchMiss => ({
  area: "news",
  lang: "fr",
  query,
  count,
  lastOn,
});

describe.each(pairs)("the searches without result counted %s", (_name, makePair) => {
  it("add up what two instances counted, keeping the latest day", async () => {
    const [a, b] = await makePair();
    await a.add([miss("passeport", 2, "2026-09-29")]);
    await b.add([miss("passeport", 3, "2026-09-28"), { ...miss("passeport", 1), lang: "wo" }]);
    const all = await a.all();
    expect(all).toHaveLength(2);
    expect(all.find((entry) => entry.lang === "fr")).toEqual(miss("passeport", 5, "2026-09-29"));
  });

  it("keep only the most searched past the maximum", async () => {
    const [store] = await makePair();
    const many = Array.from({ length: MAX_QUERIES }, (_, index) => miss(`q${String(index)}`, 2));
    await store.add(many);
    await store.add([miss("rare", 1), miss("frequent", 9)]);
    const all = await store.all();
    expect(all).toHaveLength(MAX_QUERIES);
    expect(all.some((entry) => entry.query === "frequent")).toBe(true);
    expect(all.some((entry) => entry.query === "rare")).toBe(false);
  });

  it("show nothing when nothing was counted", async () => {
    const [store] = await makePair();
    expect(await store.all()).toEqual([]);
  });
});

describe("the searches without result, between two saves", () => {
  it("are shown before being saved, and kept when a save fails", async () => {
    const kept = new FileSearchMissStore(
      join(tmpdir(), "bgs-search-misses", `${randomUUID()}.json`),
    );
    let failing = true;
    const flaky: SearchMissStore = {
      add: (misses) => (failing ? Promise.reject(new Error("store away")) : kept.add(misses)),
      all: () => kept.all(),
    };
    const misses = new SearchMisses(flaky);
    for (let index = 0; index < 3; index += 1) {
      misses.record("news", "fr", "bourse");
    }
    expect((await misses.shown())[0]?.count).toBe(3);
    await expect(misses.flush()).rejects.toThrow("store away");
    failing = false;
    await misses.flush();
    expect((await kept.all())[0]?.count).toBe(3);
  });
});
