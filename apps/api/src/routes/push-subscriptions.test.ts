import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { FilePushSubscriptionStore } from "../notifications/push-subscriptions";
import { temporaryStore } from "../testing/store";

// A placeholder token, shaped like Expo's.
const TOKEN = "ExponentPushToken[abcdefghij0123456789]";
const SUBSCRIPTION = {
  token: TOKEN,
  topics: ["conseil-des-ministres", "communiques"],
  quietHours: { from: 22, to: 7 },
  lang: "fr",
};

let app: FastifyInstance;
let store: FilePushSubscriptionStore;

beforeEach(async () => {
  store = new FilePushSubscriptionStore(join(tmpdir(), "bgs-push", `${randomUUID()}.json`));
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    pushSubscriptions: store,
  });
});

afterEach(async () => {
  await app.close();
});

const send = (method: "PUT" | "DELETE", payload: object) =>
  app.inject({ method, url: "/v1/push/subscription", payload });

describe("push subscriptions", () => {
  it("keep the sections a phone follows, then forget them on request", async () => {
    expect((await send("PUT", SUBSCRIPTION)).statusCode).toBe(204);
    expect(await store.list()).toEqual([SUBSCRIPTION]);
    expect((await send("PUT", { ...SUBSCRIPTION, topics: ["discours"] })).statusCode).toBe(204);
    expect((await store.list()).map((item) => item.topics)).toEqual([["discours"]]);
    expect((await send("DELETE", { token: TOKEN })).statusCode).toBe(204);
    expect(await store.list()).toEqual([]);
  });

  it("refuse anything else than an Expo token and the expected choices", async () => {
    expect((await send("PUT", { ...SUBSCRIPTION, token: "http://ailleurs" })).statusCode).toBe(400);
    expect((await send("PUT", { ...SUBSCRIPTION, email: "a@b.sn" })).statusCode).toBe(400);
    expect(
      (await send("PUT", { ...SUBSCRIPTION, quietHours: { from: 25, to: 7 } })).statusCode,
    ).toBe(400);
    expect(await store.list()).toEqual([]);
  });
});
