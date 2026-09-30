import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Notification } from "@bgs/shared-types";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../database/database";
import { testDatabases } from "../testing/database";
import {
  FileNotificationStore,
  type NotificationStore,
  PostgresNotificationStore,
} from "./notification-store";

let cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

/** Two instances' view of the same notifications. */
type Pair = () => Promise<[NotificationStore, NotificationStore]>;

const pairs: [string, Pair][] = [
  [
    "in a file",
    () => {
      // A file has one writer: a single API instance (no DATABASE_URL).
      const store = new FileNotificationStore(
        join(tmpdir(), "bgs-notifications", `${randomUUID()}.json`),
      );
      return Promise.resolve([store, store]);
    },
  ],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      return [new PostgresNotificationStore(database), new PostgresNotificationStore(database)];
    },
  ]),
];

const ARTICLE = "00000000-0000-5000-8000-000000000001";

const pending = (): Notification => ({
  id: randomUUID(),
  articleId: ARTICLE,
  lang: "fr",
  title: "Communiqué du Conseil des ministres",
  category: "conseil-des-ministres",
  status: "pending",
  preparedBy: { id: "a", name: "Personne A" },
  preparedAt: "2026-09-30T01:00:00.000Z",
  decidedBy: null,
  decidedAt: null,
  delivery: null,
});

/** Adds a pending notification unless one already waits for the article. */
const prepare = (store: NotificationStore, notification: Notification) =>
  store.update((all) => {
    if (
      all.some((item) => item.articleId === notification.articleId && item.status === "pending")
    ) {
      return { next: all, result: false };
    }
    return { next: [...all, notification], result: true };
  });

describe.each(pairs)("the notifications kept %s", (_name, makePair) => {
  it("share what one instance wrote with the other, changes included", async () => {
    const [a, b] = await makePair();
    const first = pending();
    await prepare(a, first);
    const decided: Notification = {
      ...first,
      status: "approved",
      decidedBy: { id: "b", name: "Personne B" },
      decidedAt: "2026-09-30T01:05:00.000Z",
      delivery: { outcome: "not-sent", at: "2026-09-30T01:05:00.000Z" },
    };
    await b.update((all) => ({
      next: all.map((item) => (item.id === first.id ? decided : item)),
      result: null,
    }));
    expect(await a.all()).toEqual([decided]);
  });

  it("keep a rule checked inside a change, even when two instances change at once", async () => {
    const [a, b] = await makePair();
    const results = await Promise.all([prepare(a, pending()), prepare(b, pending())]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await a.all()).toHaveLength(1);
  });

  it("write nothing when a change is refused", async () => {
    const [store] = await makePair();
    await expect(
      store.update(() => {
        throw new Error("refused");
      }),
    ).rejects.toThrow("refused");
    expect(await store.all()).toEqual([]);
  });
});
