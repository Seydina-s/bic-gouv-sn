import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ErrorJournalEntry } from "@bgs/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../database/database";
import { testDatabases } from "../testing/database";
import { ErrorJournal } from "./error-journal";
import {
  type ErrorJournalStore,
  FileErrorJournalStore,
  MAX_GROUPS,
  PostgresErrorJournalStore,
} from "./error-journal-store";

let cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

/** Two instances' view of the same journal. */
type Pair = () => Promise<[ErrorJournalStore, ErrorJournalStore]>;

const newPath = () => join(tmpdir(), "bgs-error-journal", `${randomUUID()}.json`);

const pairs: [string, Pair][] = [
  [
    "in a file",
    () => {
      const path = newPath();
      return Promise.resolve([new FileErrorJournalStore(path), new FileErrorJournalStore(path)]);
    },
  ],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      return [new PostgresErrorJournalStore(database), new PostgresErrorJournalStore(database)];
    },
  ]),
];

const group = (
  where: string,
  count: number,
  firstAt: string,
  lastAt: string,
  lastRequestId: string | null,
): ErrorJournalEntry => ({ code: "INTERNAL_ERROR", where, count, firstAt, lastAt, lastRequestId });

const T1 = "2026-09-29T21:00:00.000Z";
const T2 = "2026-09-29T22:00:00.000Z";
const T3 = "2026-09-29T23:00:00.000Z";

describe.each(pairs)("the error journal kept %s", (_name, makePair) => {
  it("merges what two instances journaled: counts add, times widen, latest request", async () => {
    const [a, b] = await makePair();
    await a.add([group("GET /v1/news", 2, T2, T3, "r-late")]);
    await b.add([
      group("GET /v1/news", 1, T1, T2, "r-early"),
      group("GET /v1/map", 1, T1, T1, null),
    ]);
    const all = await a.all();
    expect(all).toHaveLength(2);
    expect(all.find((entry) => entry.where === "GET /v1/news")).toEqual(
      group("GET /v1/news", 3, T1, T3, "r-late"),
    );
  });

  it("keeps only the most recent groups past the maximum", async () => {
    const [store] = await makePair();
    const many = Array.from({ length: MAX_GROUPS }, (_, index) =>
      group(`GET /v1/route-${String(index)}`, 1, T2, T2, null),
    );
    await store.add(many);
    await store.add([group("GET /v1/newest", 1, T3, T3, null)]);
    const all = await store.all();
    expect(all).toHaveLength(MAX_GROUPS);
    expect(all.some((entry) => entry.where === "GET /v1/newest")).toBe(true);
  });

  it("is empty when nothing went wrong", async () => {
    const [store] = await makePair();
    expect(await store.all()).toEqual([]);
  });
});

describe("the error journal, between two saves", () => {
  it("shows errors before they are saved, and keeps them when a save fails", async () => {
    const kept = new FileErrorJournalStore(newPath());
    let failing = true;
    const flaky: ErrorJournalStore = {
      add: (groups) => (failing ? Promise.reject(new Error("store away")) : kept.add(groups)),
      all: () => kept.all(),
    };
    const journal = new ErrorJournal(flaky);
    journal.record("INTERNAL_ERROR", "GET /v1/news", "r1", new Date(T1));
    expect(await journal.entries()).toHaveLength(1);
    await expect(journal.flush()).rejects.toThrow("store away");
    journal.record("INTERNAL_ERROR", "GET /v1/news", "r2", new Date(T2));
    failing = false;
    await journal.flush();
    expect(await kept.all()).toEqual([group("GET /v1/news", 2, T1, T2, "r2")]);
  });
});
