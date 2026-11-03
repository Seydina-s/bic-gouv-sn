import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileDurably } from "@bgs/content-store";
import type { PushSubscription } from "@bgs/shared-types";
import { describe, expect, it, vi } from "vitest";
import { ExpoPushProvider } from "./expo-push-provider";
import type { PushMessage } from "./push-message";
import { FilePendingReceiptStore, MemoryPendingReceiptStore } from "./pending-receipts";
import { FilePushSubscriptionStore } from "./push-subscriptions";

// Placeholder tokens and article, shaped like the real ones.
const token = (n: number) => `ExponentPushToken[test${String(n).padStart(10, "0")}]`;
const NOTIFICATION: PushMessage = {
  articleId: "00000000-0000-5000-8000-000000000001",
  category: "conseil-des-ministres",
  imageUrl: null,
  // An article of the Primature: the source named is its own site (12/10/2026).
  source: "primature.sn",
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
    expect(await atNoon.send(NOTIFICATION)).toEqual({ outcome: "sent", recipients: 2 });
    expect(requests[1]?.map((message) => message.to).sort()).toEqual([token(1), token(3)]);
    expect(requests[1]?.[0]).toMatchObject({
      title: "Titre officiel de test",
      body: "Source\u00a0: primature.sn",
    });
  });

  it("sends a message written in the console to every phone, whatever its sections", async () => {
    const { store, requests, fetchImpl } = await setUp([
      subscription(1),
      subscription(2, { topics: ["discours"] }),
      subscription(3, { quietHours: { from: 11, to: 14 } }),
    ]);
    const written: PushMessage = {
      articleId: null,
      category: null,
      imageUrl: "https://media.example/notifications/photo.jpg",
      source: null,
      versions: { fr: { title: "Message de test", excerpt: "Texte de test." } },
    };
    const provider = new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON });
    expect(await provider.send(written)).toEqual({ outcome: "sent", recipients: 2 });
    // Every section, but quiet hours are kept; no "Source" line, no article to open.
    expect(
      requests
        .flat()
        .map((message) => message.to)
        .sort(),
    ).toEqual([token(1), token(2)]);
    expect(requests[0]?.[0]).toEqual(
      expect.objectContaining({
        title: "Message de test",
        body: "Texte de test.",
        data: { imageUrl: "https://media.example/notifications/photo.jpg" },
      }),
    );
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
      // Also where the iPhone's notification extension reads it (AUD5-07).
      data: { imageUrl: "https://media.test/images/ab/960.jpeg" },
    });
    // A no-break space before the colon (French typography): "\s" matches it.
    expect(sent.get(token(1))?.body).toMatch(
      /^\[wo\] premiers mots de test\nSource\s:\sprimature\.sn$/,
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
    expect(requests.flat()[0]).not.toHaveProperty(["data", "imageUrl"]);
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
    await expect(provider.send(NOTIFICATION)).resolves.toEqual({ outcome: "sent", recipients: 1 });
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

describe("problems after a notification leaves the API (03/11/2026)", () => {
  type Problem = [code: string, reason: string, count: number];

  function listening(provider: ExpoPushProvider): Problem[] {
    const problems: Problem[] = [];
    provider.reportProblemsTo((code, reason, count) => problems.push([code, reason, count]));
    return problems;
  }

  it("reports every refusal at sending except a phone that is gone", async () => {
    const { store, fetchImpl } = await setUp(
      [subscription(1), subscription(2), subscription(3), subscription(4)],
      (to) =>
        to === token(1)
          ? { status: "error", details: { error: "DeviceNotRegistered" } }
          : to === token(4)
            ? { status: "ok", id: "ticket-4" }
            : { status: "error", details: { error: "InvalidCredentials" } },
    );
    const provider = new ExpoPushProvider({ subscriptions: store, fetchImpl, now: () => NOON });
    const problems = listening(provider);
    await provider.send(NOTIFICATION);
    expect(problems).toEqual([["PUSH_REJECTED", "InvalidCredentials", 2]]);
    expect((await store.list()).map((item) => item.token)).not.toContain(token(1));
  });

  it("reports the requests lost on the way, even when others went through", async () => {
    const all = Array.from({ length: 150 }, (_, n) => subscription(n));
    const { store, fetchImpl } = await setUp(all);
    let calls = 0;
    const halfDown = ((url: string, init?: RequestInit) => {
      calls += 1;
      return calls === 2 ? Promise.reject(new Error("réseau coupé")) : fetchImpl(url, init);
    }) as typeof fetch;
    const provider = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl: halfDown,
      now: () => NOON,
    });
    const problems = listening(provider);
    expect(await provider.send(NOTIFICATION)).toEqual({ outcome: "sent", recipients: 150 });
    expect(problems).toEqual([["PUSH_SERVICE_UNREACHABLE", "sending", 1]]);
  });

  it("reads Apple's and Google's answers: forgets the phones gone, reports the rest", async () => {
    const { store } = await setUp([subscription(1), subscription(2), subscription(3)]);
    const asked: unknown[] = [];
    const receipts = ((_url: string, init?: RequestInit) => {
      asked.push(JSON.parse(typeof init?.body === "string" ? init.body : "{}"));
      const data = {
        "ticket-1": { status: "error", details: { error: "DeviceNotRegistered" } },
        "ticket-2": { status: "error", details: { error: "MessageTooBig" } },
        "ticket-3": { status: "ok" },
      };
      return Promise.resolve(new Response(JSON.stringify({ data })));
    }) as typeof fetch;
    const provider = new ExpoPushProvider({ subscriptions: store, fetchImpl: receipts });
    const problems = listening(provider);
    await provider.readReceipts(
      [1, 2, 3].map((n) => ({ id: `ticket-${String(n)}`, token: token(n) })),
    );
    expect(asked).toEqual([{ ids: ["ticket-1", "ticket-2", "ticket-3"] }]);
    expect(problems).toEqual([["PUSH_NOT_DELIVERED", "MessageTooBig", 1]]);
    expect((await store.list()).map((item) => item.token).sort()).toEqual([token(2), token(3)]);
  });

  it("reads the receipts by itself a while after sending", async () => {
    const { store, fetchImpl } = await setUp([subscription(1)], () => ({
      status: "ok",
      id: "ticket-1",
    }));
    const urls: string[] = [];
    const recording = ((url: string, init?: RequestInit) => {
      urls.push(url);
      return url.endsWith("getReceipts")
        ? Promise.resolve(new Response(JSON.stringify({ data: { "ticket-1": { status: "ok" } } })))
        : fetchImpl(url, init);
    }) as typeof fetch;
    const provider = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl: recording,
      now: () => NOON,
      receiptsAfterMs: 0,
    });
    await provider.send(NOTIFICATION);
    const stop = provider.checkReceiptsEvery(60_000);
    await vi.waitFor(() => {
      expect(urls.filter((url) => url.endsWith("getReceipts"))).toHaveLength(1);
    });
    stop();
  });

  it("reads after a restart the receipts of a sending made before it (03/11/2026)", async () => {
    const { store, fetchImpl } = await setUp([subscription(1)], () => ({
      status: "ok",
      id: "ticket-1",
    }));
    const pendingReceipts = new FilePendingReceiptStore(
      join(tmpdir(), "bgs-receipts", randomUUID()),
    );
    let clock = NOON;
    const sender = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl,
      now: () => clock,
      pendingReceipts,
    });
    await sender.send(NOTIFICATION);
    // The API restarts; Apple has refused the message meanwhile.
    const asked: unknown[] = [];
    const receipts = ((_url: string, init?: RequestInit) => {
      asked.push(JSON.parse(typeof init?.body === "string" ? init.body : "{}"));
      const data = { "ticket-1": { status: "error", details: { error: "InvalidCredentials" } } };
      return Promise.resolve(new Response(JSON.stringify({ data })));
    }) as typeof fetch;
    const restarted = new ExpoPushProvider({
      subscriptions: store,
      fetchImpl: receipts,
      now: () => clock,
      pendingReceipts,
    });
    const problems = listening(restarted);
    await restarted.readDueReceipts();
    expect(asked).toEqual([]); // not before Expo's 15 minutes
    clock = NOON + 15 * 60_000;
    await restarted.readDueReceipts();
    await restarted.readDueReceipts();
    expect(asked).toEqual([{ ids: ["ticket-1"] }]); // once, then forgotten
    expect(problems).toEqual([["PUSH_NOT_DELIVERED", "InvalidCredentials", 1]]);
  });

  it("keeps the receipts it could not read for the next check, a day at most", async () => {
    const { store } = await setUp([subscription(1)]);
    const pendingReceipts = new MemoryPendingReceiptStore();
    await pendingReceipts.add(NOON, [{ id: "ticket-1", token: token(1) }]);
    let clock = NOON;
    let up = false;
    const provider = new ExpoPushProvider({
      subscriptions: store,
      now: () => clock,
      pendingReceipts,
      fetchImpl: () =>
        up
          ? Promise.resolve(new Response(JSON.stringify({ data: {} })))
          : Promise.reject(new Error("down")),
    });
    const problems = listening(provider);
    await provider.readDueReceipts();
    expect(await pendingReceipts.due(clock)).toHaveLength(1);
    up = true;
    await provider.readDueReceipts();
    expect(await pendingReceipts.due(clock)).toEqual([]);
    await pendingReceipts.add(NOON, [{ id: "ticket-2", token: token(1) }]);
    up = false;
    clock = NOON + 24 * 60 * 60_000;
    await provider.readDueReceipts();
    expect(await pendingReceipts.due(clock)).toEqual([]);
    expect(problems).toEqual([
      ["PUSH_SERVICE_UNREACHABLE", "receipts: Error", 1],
      ["PUSH_SERVICE_UNREACHABLE", "receipts: Error", 1],
    ]);
  });
});
