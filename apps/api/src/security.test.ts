import { writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomInt, randomUUID } from "node:crypto";
import { FileArticleRepository } from "@bgs/content-store";
import { apiErrorSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { temporaryStore } from "./testing/store";

let app: FastifyInstance;

async function start(env: Record<string, string>, articles = temporaryStore()) {
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent", ...env }),
    version: "1.0.0",
    articles,
  });
  return app;
}

afterEach(async () => {
  await app.close();
});

describe("security headers", () => {
  it("sends hardening headers and a strict CSP in production", async () => {
    const response = await (await start({ NODE_ENV: "production" })).inject({ url: "/v1/health" });
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toContain("max-age=");
    expect(response.headers["content-security-policy"]).toBe(
      "default-src 'none';frame-ancestors 'none'",
    );
  });

  it("does not set a CSP in development, so the API docs keep working", async () => {
    const response = await (await start({})).inject({ url: "/v1/health" });
    expect(response.headers["content-security-policy"]).toBeUndefined();
  });
});

describe("rate limiting", () => {
  it("answers 429 RATE_LIMITED past the limit, with a retry hint", async () => {
    const api = await start({ RATE_LIMIT_PER_MINUTE: "2" });
    await api.inject({ url: "/v1/news" });
    await api.inject({ url: "/v1/news" });
    const limited = await api.inject({ url: "/v1/news" });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers["retry-after"]).toBeDefined();
    expect(apiErrorSchema.parse(limited.json()).code).toBe("RATE_LIMITED");
  });

  it("never limits health probes", async () => {
    const api = await start({ RATE_LIMIT_PER_MINUTE: "1" });
    for (let i = 0; i < 3; i += 1) {
      expect((await api.inject({ url: "/v1/health" })).statusCode).toBe(200);
    }
  });
});

const redisUrl = process.env["REDIS_URL"];

// The counter skips a failing Redis (requests go through), so only a real Redis shows
// that the client library still drives it.
describe.runIf(redisUrl !== undefined)("rate limiting shared in Redis (SCALE-01)", () => {
  it("counts the requests of two instances together", async () => {
    const env = { RATE_LIMIT_PER_MINUTE: "2", REDIS_URL: String(redisUrl) };
    const other = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent", ...env }),
      version: "1.0.0",
      articles: temporaryStore(),
    });
    try {
      const api = await start(env);
      // A new address on each run: the counter lives one minute in the shared Redis.
      const remoteAddress = `10.${String(randomInt(256))}.${String(randomInt(256))}.${String(randomInt(256))}`;
      expect((await api.inject({ url: "/v1/news", remoteAddress })).statusCode).toBe(200);
      expect((await other.inject({ url: "/v1/news", remoteAddress })).statusCode).toBe(200);
      expect((await api.inject({ url: "/v1/news", remoteAddress })).statusCode).toBe(429);
    } finally {
      await other.close();
    }
  });
});

describe("GET /v1/health/ready", () => {
  it("is ready when the article store is readable", async () => {
    const response = await (await start({})).inject({ url: "/v1/health/ready" });
    expect(response.json()).toEqual({ status: "ready" });
  });

  it("answers 503 SERVICE_NOT_READY when the store is unreadable", async () => {
    const broken = join(tmpdir(), `bgs-broken-${randomUUID()}.json`);
    await writeFile(broken, "not json");
    const response = await (
      await start({}, new FileArticleRepository(broken))
    ).inject({
      url: "/v1/health/ready",
    });
    expect(response.statusCode).toBe(503);
    expect(apiErrorSchema.parse(response.json()).code).toBe("SERVICE_NOT_READY");
  });
});
