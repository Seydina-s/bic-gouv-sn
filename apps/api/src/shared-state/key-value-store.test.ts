import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { describe, expect, it } from "vitest";
import { MemoryKeyValueStore, RedisKeyValueStore, type KeyValueStore } from "./key-value-store";

interface Subject {
  store: KeyValueStore;
  /** Lets `ms` pass (a fake clock in memory, real time with Redis). */
  pass: (ms: number) => Promise<void>;
}

function memory(): Subject {
  let now = Date.parse("2026-09-29T22:00:00Z");
  return {
    store: new MemoryKeyValueStore(() => now),
    pass: (ms) => {
      now += ms;
      return Promise.resolve();
    },
  };
}

function redis(url: string): Subject {
  return {
    // A fresh prefix per test: runs never see each other's keys.
    store: new RedisKeyValueStore(new Redis(url), `bgs-test:${randomUUID()}:`),
    pass: (ms) => new Promise((resolve) => setTimeout(resolve, ms + 30)),
  };
}

const subjects: [string, () => Subject][] = [["in memory", memory]];
const redisUrl = process.env["REDIS_URL"];
if (redisUrl !== undefined) {
  subjects.push(["in Redis", () => redis(redisUrl)]);
}

describe.each(subjects)("the shared key-value store %s", (_name, make) => {
  it("keeps a value until it expires", async () => {
    const { store, pass } = make();
    await store.set("a", "1", 200);
    expect(await store.get("a")).toBe("1");
    await pass(250);
    expect(await store.get("a")).toBeNull();
    await store.close();
  });

  it("claims a key only once, as long as it lives", async () => {
    const { store, pass } = make();
    expect(await store.setIfAbsent("claim", "first", 200)).toBe(true);
    expect(await store.setIfAbsent("claim", "second", 200)).toBe(false);
    expect(await store.get("claim")).toBe("first");
    await pass(250);
    expect(await store.setIfAbsent("claim", "third", 200)).toBe(true);
    await store.close();
  });

  it("deletes, and keeps sets of members that expire together", async () => {
    const { store, pass } = make();
    await store.set("gone", "x", 10_000);
    await store.delete("gone");
    expect(await store.get("gone")).toBeNull();
    await store.addToSet("sessions", "one", 200);
    await store.addToSet("sessions", "two", 200);
    expect((await store.membersOf("sessions")).sort()).toEqual(["one", "two"]);
    await pass(250);
    expect(await store.membersOf("sessions")).toEqual([]);
    await store.close();
  });
});
