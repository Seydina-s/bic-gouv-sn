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

afterEach(async () => {
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
        new FilePushSubscriptionStore(path),
        new FilePushSubscriptionStore(path),
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
        new PostgresPushSubscriptionStore(database),
        new PostgresPushSubscriptionStore(database),
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
    });
  });
});
