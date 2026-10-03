import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UsageFile } from "@bgs/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "@bgs/database";
import { testDatabases } from "@bgs/database/testing";
import { emptyDay, emptyUsage, MAX_ARTICLES_PER_DAY } from "./usage-counts";
import { FileUsageStore, PostgresUsageStore, type UsageStore } from "./usage-store";

let cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

/** Two instances' view of the same counters. */
type Pair = () => Promise<[UsageStore, UsageStore]>;

const filePair: Pair = () => {
  const path = join(tmpdir(), "bgs-usage", `${randomUUID()}.json`);
  return Promise.resolve([new FileUsageStore(path), new FileUsageStore(path)]);
};

const pairs: [string, Pair][] = [
  ["in a file", filePair],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      return [new PostgresUsageStore(database), new PostgresUsageStore(database)];
    },
  ]),
];

function oneDay(day: string, active: number, reads: Record<string, number> = {}): UsageFile {
  const usage = emptyUsage();
  usage.days[day] = { ...emptyDay(), active, platforms: { android: active }, reads };
  usage.weeks["2026-W40"] = active;
  return usage;
}

describe.each(pairs)("the usage counters kept %s", (_name, makePair) => {
  it("add up what two instances counted, instead of overwriting it", async () => {
    const [a, b] = await makePair();
    await a.add(oneDay("2026-09-29", 2, { article: 1 }), "2025-01-01");
    await b.add(oneDay("2026-09-29", 3, { article: 2 }), "2025-01-01");
    const { usage } = await a.load("2026-09-01");
    expect(usage.days["2026-09-29"]).toMatchObject({
      active: 5,
      platforms: { android: 5 },
      reads: { article: 3 },
    });
    expect(usage.weeks["2026-W40"]).toBe(5);
  });

  it("forget days past the horizon, and read only the days asked for", async () => {
    const [store] = await makePair();
    await store.add(oneDay("2025-01-01", 1), "2024-01-01");
    await store.add(oneDay("2026-08-01", 1), "2024-01-01");
    await store.add(oneDay("2026-09-29", 1), "2025-06-01");
    const all = await store.load("2000-01-01");
    expect(Object.keys(all.usage.days).sort()).toEqual(["2026-08-01", "2026-09-29"]);
    const recent = await store.load("2026-09-01");
    expect(Object.keys(recent.usage.days)).toEqual(["2026-09-29"]);
    expect(recent.since).toBe("2026-08-01");
    expect(recent.usage.weeks["2026-W40"]).toBe(3);
  });

  it("stop counting new articles past the day's maximum", async () => {
    const [store] = await makePair();
    const reads = Object.fromEntries(
      Array.from({ length: MAX_ARTICLES_PER_DAY }, (_, index) => [`article-${String(index)}`, 1]),
    );
    await store.add(oneDay("2026-09-29", 1, reads), "2025-01-01");
    await store.add(oneDay("2026-09-29", 1, { "article-0": 1, extra: 1 }), "2025-01-01");
    const { usage } = await store.load("2026-09-01");
    const day = usage.days["2026-09-29"];
    expect(Object.keys(day?.reads ?? {})).toHaveLength(MAX_ARTICLES_PER_DAY);
    expect(day?.reads["article-0"]).toBe(2);
  });

  it("say when nothing was ever counted", async () => {
    const [store] = await makePair();
    expect(await store.load("2026-09-01")).toEqual({ usage: emptyUsage(), since: null });
  });
});

describe.each(testDatabases())("the usage counters in PostgreSQL %s", (_name, open) => {
  it("lose nothing when instances add at the same moment", async () => {
    const database = await open();
    cleanups.push(() => database.close());
    await migrate(database);
    const stores = Array.from({ length: 5 }, () => new PostgresUsageStore(database));
    await Promise.all(stores.map((store) => store.add(oneDay("2026-09-29", 1), "2025-01-01")));
    const { usage } = await new PostgresUsageStore(database).load("2026-09-01");
    expect(usage.days["2026-09-29"]?.active).toBe(5);
  });
});
