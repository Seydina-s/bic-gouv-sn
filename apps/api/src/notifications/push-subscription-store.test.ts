import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PushSubscription } from "@bgs/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../database/database";
import { testDatabases } from "../testing/database";
import {
  FilePushSubscriptionStore,
  PostgresPushSubscriptionStore,
  type PushSubscriptionStore,
} from "./push-subscriptions";

let cleanups: (() => Promise<void>)[] = [];
/** The stores' clock, moved forward by the tests. */
let today = new Date("2026-10-01T10:00:00Z");
const clock = () => today;
const HOUR_MS = 60 * 60 * 1000;

afterEach(async () => {
  today = new Date("2026-10-01T10:00:00Z");
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

/** Two instances' view of the same subscriptions. */
type Pair = () => Promise<[PushSubscriptionStore, PushSubscriptionStore]>;

const pairs: [string, Pair][] = [
  [
    "in a file",
    () => {
      const path = join(tmpdir(), "bgs-push", `${randomUUID()}.json`);
      return Promise.resolve([
        new FilePushSubscriptionStore(path, clock),
        new FilePushSubscriptionStore(path, clock),
      ]);
    },
  ],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      return [
        new PostgresPushSubscriptionStore(database, clock),
        new PostgresPushSubscriptionStore(database, clock),
      ];
    },
  ]),
];

// Placeholder tokens, shaped like Expo's.
const phone = (letter: string, topics: string[]): PushSubscription => ({
  token: `ExponentPushToken[${letter.repeat(20)}]`,
  topics,
  quietHours: null,
  lang: "fr",
});

describe.each(pairs)("the push subscriptions kept %s", (_name, makePair) => {
  it("share what one instance saved with the other, replaced by token", async () => {
    const [a, b] = await makePair();
    await a.save({ ...phone("a", ["discours"]), quietHours: { from: 22, to: 7 } });
    await a.save({ ...phone("a", ["communiques"]), quietHours: { from: 22, to: 7 }, lang: "wo" });
    await b.save(phone("b", ["discours"]));
    expect(await b.list()).toEqual([
      { ...phone("a", ["communiques"]), quietHours: { from: 22, to: 7 }, lang: "wo" },
      phone("b", ["discours"]),
    ]);
  });

  it("find the phones following a section", async () => {
    const [store] = await makePair();
    await store.save(phone("a", ["discours", "communiques"]));
    await store.save(phone("b", ["audiences"]));
    expect((await store.following("communiques")).map((item) => item.token)).toEqual([
      phone("a", []).token,
    ]);
    expect(await store.following("international")).toEqual([]);
  });

  it("forget a phone that follows nothing, or that Expo no longer knows", async () => {
    const [store] = await makePair();
    await store.save(phone("a", ["discours"]));
    await store.save(phone("b", ["discours"]));
    await store.save(phone("a", []));
    await store.remove([phone("b", []).token]);
    await store.remove([]);
    expect(await store.list()).toEqual([]);
  });

  it("count the phones and their choices, never showing a token", async () => {
    const [store] = await makePair();
    expect(await store.summary()).toEqual({
      total: 0,
      everySection: 0,
      quietHours: 0,
      french: 0,
      wolof: 0,
      newLastDay: 0,
      newWeekBefore: 0,
    });
    await store.save({ ...phone("a", ["discours"]), quietHours: { from: 22, to: 7 } });
    await store.save({ ...phone("b", []), topics: null, lang: "wo" });
    await store.save({ ...phone("c", []), topics: null });
    expect(await store.summary()).toEqual({
      total: 3,
      everySection: 2,
      quietHours: 1,
      french: 2,
      wolof: 1,
      newLastDay: 3,
      newWeekBefore: 0,
    });
  });

  it("count the phones new in the last 24 hours apart from the week before, for the console", async () => {
    const [store] = await makePair();
    await store.save(phone("a", ["discours"]));
    today = new Date(today.getTime() + 3 * 24 * HOUR_MS);
    await store.save(phone("b", ["discours"]));
    // Changing its choices does not make a phone new again.
    await store.save(phone("a", ["communiques"]));
    today = new Date(today.getTime() + 2 * HOUR_MS);
    await store.save(phone("c", ["discours"]));
    expect(await store.summary()).toMatchObject({ total: 3, newLastDay: 2, newWeekBefore: 1 });
    // Ten days on, none of them is recent any more.
    today = new Date(today.getTime() + 10 * 24 * HOUR_MS);
    expect(await store.summary()).toMatchObject({ total: 3, newLastDay: 0, newWeekBefore: 0 });
  });
});
