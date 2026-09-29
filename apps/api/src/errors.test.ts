import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apiErrorSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { temporaryStore } from "./testing/store";
import { UsageStats } from "./usage/usage-stats";

let app: FastifyInstance;

beforeEach(async () => {
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    usageStats: await UsageStats.open(join(tmpdir(), "bgs-errors", `${randomUUID()}.json`)),
  });
});

afterEach(async () => {
  await app.close();
});

const post = (contentType: string, payload: string) =>
  app.inject({
    method: "POST",
    url: "/v1/stats",
    headers: { "content-type": contentType },
    payload,
  });

describe("malformed requests (self-check of 29/09/2026)", () => {
  it("are refused as the client's fault, never answered as an internal error", async () => {
    const cases = [
      {
        name: "broken JSON",
        response: await post("application/json", "{pas du json"),
        status: 400,
      },
      {
        name: "__proto__ in the body",
        response: await post("application/json", '{"__proto__":{"admin":true}}'),
        status: 400,
      },
      {
        name: "body too large",
        response: await post("application/json", JSON.stringify({ big: "x".repeat(2_000_000) })),
        status: 413,
      },
      { name: "unexpected content type", response: await post("text/xml", "<a/>"), status: 415 },
    ];
    for (const { name, response, status } of cases) {
      expect([name, response.statusCode]).toEqual([name, status]);
      expect(apiErrorSchema.parse(response.json()).code).toBe("REQUEST_INVALID");
    }
  });
});
