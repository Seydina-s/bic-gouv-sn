import { apiErrorSchema, healthResponseSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { temporaryStore } from "./testing/store";

let app: FastifyInstance;

async function start(env: Record<string, string> = {}) {
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent", ...env }),
    version: "1.2.3",
    articles: temporaryStore(),
  });
  return app;
}

afterEach(async () => {
  await app.close();
});

describe("GET /v1/health", () => {
  it("answers ok with the deployed version, never cached", async () => {
    const response = await (await start()).inject({ method: "GET", url: "/v1/health" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = healthResponseSchema.parse(response.json());
    expect(body.version).toBe("1.2.3");
  });

  it("tags every response with a unique request id", async () => {
    const first = await (await start()).inject({ method: "GET", url: "/v1/health" });
    const second = await app.inject({ method: "GET", url: "/v1/nope" });
    const firstId = first.headers["x-request-id"];
    expect(firstId).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.headers["x-request-id"]).not.toBe(firstId);
    expect(apiErrorSchema.parse(second.json()).requestId).toBe(second.headers["x-request-id"]);
  });
});

describe("errors", () => {
  it("returns a uniform JSON 404 for unknown routes", async () => {
    const response = await (await start()).inject({ method: "GET", url: "/v1/nope" });
    expect(response.statusCode).toBe(404);
    const body = apiErrorSchema.parse(response.json());
    expect(body.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns 400 REQUEST_INVALID on validation errors", async () => {
    const api = await start();
    api.get(
      "/test/validated",
      { schema: { querystring: z.object({ page: z.coerce.number().int() }) } },
      () => ({ ok: true }),
    );
    const response = await api.inject({ method: "GET", url: "/test/validated?page=abc" });
    expect(response.statusCode).toBe(400);
    expect(apiErrorSchema.parse(response.json()).code).toBe("REQUEST_INVALID");
  });

  it("hides internal details on unexpected errors", async () => {
    const api = await start();
    api.get("/test/crash", () => {
      throw new Error("database password is hunter2");
    });
    const response = await api.inject({ method: "GET", url: "/test/crash" });
    expect(response.statusCode).toBe(500);
    expect(response.body).not.toContain("hunter2");
    expect(apiErrorSchema.parse(response.json()).code).toBe("INTERNAL_ERROR");
  });
});

describe("OpenAPI", () => {
  it("documents /v1/health in OpenAPI 3.1", async () => {
    const response = await (await start()).inject({ method: "GET", url: "/v1/openapi.json" });
    const spec = response.json<{ openapi: string; paths: Record<string, unknown> }>();
    expect(spec.openapi).toBe("3.1.0");
    expect(Object.keys(spec.paths)).toContain("/v1/health");
  });

  it("serves interactive docs in development only", async () => {
    const devDocs = await (await start()).inject({ method: "GET", url: "/docs" });
    expect(devDocs.statusCode).not.toBe(404);
    await app.close();

    const prodDocs = await (
      await start({ NODE_ENV: "production" })
    ).inject({
      method: "GET",
      url: "/docs",
    });
    expect(prodDocs.statusCode).toBe(404);
  });
});
