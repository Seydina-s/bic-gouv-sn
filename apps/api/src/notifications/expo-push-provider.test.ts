import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Notification, PushSubscription } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { ExpoPushProvider } from "./expo-push-provider";
import { FilePushSubscriptionStore } from "./push-subscriptions";

// Placeholder tokens and article, shaped like the real ones.
const token = (n: number) => `ExponentPushToken[test${String(n).padStart(10, "0")}]`;
const NOTIFICATION: Notification = {
  id: randomUUID(),
  articleId: "00000000-0000-5000-8000-000000000001",
  lang: "fr",
  title: "Titre officiel de test",
  category: "conseil-des-ministres",
  status: "approved",
  preparedBy: { id: "a", name: "A" },
  preparedAt: "2026-09-29T08:00:00.000Z",
  decidedBy: { id: "b", name: "B" },
  decidedAt: "2026-09-29T08:05:00.000Z",
  delivery: null,
};
const NOON = Date.parse("2026-09-29T12:00:00Z");
const NIGHT = Date.parse("2026-09-29T23:00:00Z");

function subscription(n: number, overrides: Partial<PushSubscription> = {}): PushSubscription {
  return {
    token: token(n),
    topics: ["conseil-des-ministres"],
    quietHours: { from: 22, to: 7 },
    lang: "fr",
    ...overrides,
  };
}

async function setUp(subscriptions: PushSubscription[], answer?: (to: string) => object) {
  const store = new FilePushSubscriptionStore(join(tmpdir(), "bgs-push", `${randomUUID()}.json`));
  for (const item of subscriptions) {
    await store.save(item);
  }
  const requests: { to: string; title: string; body: string }[][] = [];
  const fetchImpl = ((_url: string, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? init.body : "[]";
    const chunk = JSON.parse(body) as { to: string; title: string; body: string }[];
    requests.push(chunk);
    const data = chunk.map((message) => answer?.(message.to) ?? { status: "ok", id: "x" });
    return Promise.resolve(new Response(JSON.stringify({ data })));
  }) as typeof fetch;
  return { store, requests, fetchImpl };
}

describe("sending a notification through Expo", () => {
  it("reaches the phones following the section, outside their quiet hours", async () => {
    const { store, requests, fetchImpl } = await setUp([
      subscription(1),
      subscription(2, { topics: ["discours"] }),
      subscription(3, { quietHours: null }),
    ]);
    const atNight = new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NIGHT });
    await atNight.send(NOTIFICATION);
    // At 23 h, only the phone without quiet hours; never the one following another section.
    expect(requests.flat().map((message) => message.to)).toEqual([token(3)]);
    const atNoon = new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON });
    await atNoon.send(NOTIFICATION);
    expect(requests[1]?.map((message) => message.to).sort()).toEqual([token(1), token(3)]);
    expect(requests[1]?.[0]).toMatchObject({
      title: "Titre officiel de test",
      body: "Source : presidence.sn",
    });
  });

  it("sends by batches of 100 and forgets phones Expo no longer knows", async () => {
    const all = Array.from({ length: 150 }, (_, n) => subscription(n));
    const { store, requests, fetchImpl } = await setUp(all, (to) =>
      to === token(7)
        ? { status: "error", details: { error: "DeviceNotRegistered" } }
        : { status: "ok" },
    );
    await new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON }).send(
      NOTIFICATION,
    );
    expect(requests.map((chunk) => chunk.length)).toEqual([100, 50]);
    const left = (await store.list()).map((item) => item.token);
    expect(left).toHaveLength(149);
    expect(left).not.toContain(token(7));
  });

  it("fails when the service cannot be reached, so the console records it", async () => {
    const store = new FilePushSubscriptionStore(join(tmpdir(), "bgs-push", `${randomUUID()}.json`));
    await store.save(subscription(1));
    const down = (() => Promise.reject(new Error("réseau coupé"))) as typeof fetch;
    const provider = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl: down,
      now: () => NOON,
    });
    await expect(provider.send(NOTIFICATION)).rejects.toThrow(/unreachable/);
  });

  it("forgets a phone that follows no section any more", async () => {
    const store = new FilePushSubscriptionStore(join(tmpdir(), "bgs-push", `${randomUUID()}.json`));
    await store.save(subscription(1));
    await store.save(subscription(1, { topics: [] }));
    expect(await store.list()).toEqual([]);
  });
});
