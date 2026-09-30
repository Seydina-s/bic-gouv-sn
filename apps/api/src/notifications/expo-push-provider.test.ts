import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileDurably } from "@bgs/content-store";
import type { PushSubscription } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { ExpoPushProvider } from "./expo-push-provider";
import type { PushMessage } from "./push-message";
import { FilePushSubscriptionStore } from "./push-subscriptions";

// Placeholder tokens and article, shaped like the real ones.
const token = (n: number) => `ExponentPushToken[test${String(n).padStart(10, "0")}]`;
const NOTIFICATION: PushMessage = {
  articleId: "00000000-0000-5000-8000-000000000001",
  category: "conseil-des-ministres",
  imageUrl: null,
  versions: { fr: { title: "Titre officiel de test", excerpt: "" } },
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
  const path = join(tmpdir(), "bgs-push", `${randomUUID()}.json`);
  // Written in one go: 150 durable saves in a row took over 30 s on a busy machine (QA-11).
  await writeFileDurably(path, JSON.stringify({ schemaVersion: 1, subscriptions }));
  const store = new FilePushSubscriptionStore(path);
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
      body: "Source\u00a0: presidence.sn",
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

  it("announces the article in each person's language, with its first words and cover", async () => {
    const { store, requests, fetchImpl } = await setUp([
      subscription(1, { lang: "wo", topics: null }),
      subscription(2, { lang: "fr" }),
    ]);
    const message: PushMessage = {
      ...NOTIFICATION,
      imageUrl: "https://media.test/images/ab/960.jpeg",
      versions: {
        // Placeholders: no Wolof is ever written by hand (W-01).
        fr: { title: "Titre", excerpt: "Premiers mots…" },
        wo: { title: "[wo] titre de test", excerpt: "[wo] premiers mots de test" },
      },
    };
    await new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON }).send(message);
    const sent = new Map(requests.flat().map((item) => [item.to, item]));
    expect(sent.get(token(1))).toMatchObject({
      title: "[wo] titre de test",
      richContent: { image: "https://media.test/images/ab/960.jpeg" },
      mutableContent: true,
    });
    // A no-break space before the colon (French typography): "\s" matches it.
    expect(sent.get(token(1))?.body).toMatch(
      /^\[wo\] premiers mots de test\nSource\s:\spresidence\.sn$/,
    );
    expect(sent.get(token(2))).toMatchObject({ title: "Titre" });
  });

  it("falls back to French for a language the article is not published in", async () => {
    const { store, requests, fetchImpl } = await setUp([subscription(1, { lang: "wo" })]);
    await new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON }).send(
      NOTIFICATION,
    );
    expect(requests.flat()[0]).toMatchObject({ title: "Titre officiel de test" });
    expect(requests.flat()[0]).not.toHaveProperty("richContent");
  });

  it("slows down and tries again when Expo says it goes too fast, never twice otherwise", async () => {
    const store = new FilePushSubscriptionStore(join(tmpdir(), "bgs-push", `${randomUUID()}.json`));
    await store.save(subscription(1));
    const answers = [429, 200];
    const seen: number[] = [];
    const fetchImpl = (() => {
      const status = answers.shift() ?? 500;
      seen.push(status);
      const body = status === 200 ? JSON.stringify({ data: [{ status: "ok" }] }) : "{}";
      return Promise.resolve(new Response(body, { status }));
    }) as typeof fetch;
    const provider = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl,
      now: () => NOON,
      retryBaseDelayMs: 1,
    });
    await expect(provider.send(NOTIFICATION)).resolves.toBe("sent");
    expect(seen).toEqual([429, 200]);
    // A server error is not retried: Expo may have sent part of it already.
    answers.push(500);
    await expect(provider.send(NOTIFICATION)).rejects.toThrow(/unreachable/);
    expect(seen).toEqual([429, 200, 500]);
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
