import { randomUUID } from "node:crypto";
import { activationSchema, accountsResponseSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { Redis } from "ioredis";
import { afterEach, describe, expect, it } from "vitest";
import type { AdminServices } from "../app";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";
import { MemoryKeyValueStore, RedisKeyValueStore, type KeyValueStore } from "./key-value-store";

/** What each of two instances sees of the state: one object, or two Redis clients. */
function memoryPair(): [KeyValueStore, KeyValueStore] {
  const shared = new MemoryKeyValueStore();
  return [shared, shared];
}

function redisPair(url: string): [KeyValueStore, KeyValueStore] {
  const prefix = `bgs-test:${randomUUID()}:`;
  return [
    new RedisKeyValueStore(new Redis(url), prefix),
    new RedisKeyValueStore(new Redis(url), prefix),
  ];
}

const pairs: [string, () => [KeyValueStore, KeyValueStore]][] = [["in memory", memoryPair]];
const redisUrl = process.env["REDIS_URL"];
if (redisUrl !== undefined) {
  pairs.push(["in Redis", () => redisPair(redisUrl)]);
}

let apps: FastifyInstance[] = [];

afterEach(async () => {
  for (const app of apps) {
    await app.close().catch(() => undefined);
  }
  apps = [];
});

const build = async (state: KeyValueStore, admin: AdminServices) => {
  const app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin,
    sharedState: state,
  });
  apps.push(app);
  return app;
};

const as = (app: FastifyInstance, token: string, method: "GET" | "POST", url: string, extra = {}) =>
  app.inject({
    method,
    url: `/admin/v1${url}`,
    headers: { authorization: `Bearer ${token}` },
    ...extra,
  });

describe.each(pairs)("two API instances sharing their state %s (SCALE-01)", (_name, makePair) => {
  async function twoInstances() {
    const [stateA, stateB] = makePair();
    const admin = await adminForTests(stateA);
    const a = await build(stateA, admin.admin);
    const b = await build(stateB, admin.otherInstance(stateB));
    return { admin, a, b };
  }

  it("keep a console session opened on one valid on the other, and closed on both", async () => {
    const { admin, a, b } = await twoInstances();
    // Signed in through instance A.
    const { token } = await admin.signedIn("admin");
    expect((await as(b, token, "GET", "/auth/me")).statusCode).toBe(200);
    // Signed out through instance B: instance A refuses the session too.
    await as(b, token, "POST", "/auth/sign-out");
    expect((await as(a, token, "GET", "/auth/me")).statusCode).toBe(401);
  });

  it("close someone's sessions everywhere when an administrator disables the account", async () => {
    const { admin, a, b } = await twoInstances();
    const { token } = await admin.signedIn("admin");
    const other = await admin.signedIn("editor");
    expect((await as(b, other.token, "GET", "/auth/me")).statusCode).toBe(200);
    await as(a, token, "POST", `/accounts/${other.id}/disable`);
    expect((await as(b, other.token, "GET", "/auth/me")).statusCode).toBe(401);
  });

  it("do a write sent to both with the same key only once", async () => {
    const { admin, a, b } = await twoInstances();
    const { token } = await admin.signedIn("admin");
    const person = { name: "Personne de test", email: "multi@bic.test", role: "reviewer" };
    const send = (app: FastifyInstance) =>
      as(app, token, "POST", "/accounts", {
        payload: person,
        headers: {
          authorization: `Bearer ${token}`,
          "idempotency-key": "cle-de-test-multi-instances",
        },
      });
    const first = activationSchema.parse((await send(a)).json());
    const again = await send(b);
    expect(again.headers["idempotent-replayed"]).toBe("true");
    expect(activationSchema.parse(again.json()).account.id).toBe(first.account.id);
    const list = accountsResponseSchema.parse((await as(a, token, "GET", "/accounts")).json());
    expect(list.accounts.filter((account) => account.email === "multi@bic.test")).toHaveLength(1);
  });
});
