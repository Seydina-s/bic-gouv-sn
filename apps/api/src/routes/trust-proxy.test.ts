import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { FileParticipationStore } from "../participation/participation";
import { temporaryStore } from "../testing/store";

let dir: string;
const apps: FastifyInstance[] = [];

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-proxy-"));
});

afterEach(async () => {
  for (const app of apps.splice(0)) {
    await app.close();
  }
  await rm(dir, { recursive: true, force: true });
});

async function start(env: Record<string, string>): Promise<FastifyInstance> {
  const app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent", ...env }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: null,
    participationStore: new FileParticipationStore(join(dir, `${String(apps.length)}.json`)),
  });
  apps.push(app);
  return app;
}

/** Six messages from one person, then one from another: what each one gets. */
async function sixThenAnother(app: FastifyInstance): Promise<{ sixth: number; other: number }> {
  const send = (from: string) =>
    app.inject({
      method: "POST",
      url: "/v1/participation/messages",
      headers: { "x-forwarded-for": from },
      payload: { topic: "autre", text: "Un message fictif pour les tests.", lang: "fr" },
    });
  let sixth = 0;
  for (let i = 0; i < 6; i += 1) {
    sixth = (await send("198.51.100.7")).statusCode;
  }
  return { sixth, other: (await send("198.51.100.8")).statusCode };
}

describe("the address each limit counts", () => {
  it("is each person's own behind a declared proxy", async () => {
    expect(await sixThenAnother(await start({ TRUST_PROXY: "1" }))).toEqual({
      sixth: 429,
      other: 201,
    });
  });

  it("ignores what a client claims when no proxy is declared", async () => {
    // Without TRUST_PROXY, X-Forwarded-For is not believed: anyone could forge it.
    expect(await sixThenAnother(await start({}))).toEqual({ sixth: 429, other: 429 });
  });

  it("accepts a number of hops or a list of addresses, and nothing else", () => {
    expect(loadConfig({ TRUST_PROXY: "2" }).TRUST_PROXY).toBe(2);
    expect(loadConfig({ TRUST_PROXY: "10.0.0.0/8, 127.0.0.1" }).TRUST_PROXY).toEqual([
      "10.0.0.0/8",
      "127.0.0.1",
    ]);
    expect(() => loadConfig({ TRUST_PROXY: "true" })).toThrow();
  });
});
