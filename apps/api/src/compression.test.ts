import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { temporaryStore } from "./testing/store";

const TINY_ARCHIVE = fileURLToPath(
  new URL("./testing/fixtures/senegal-z0-2.pmtiles", import.meta.url),
);

let app: FastifyInstance;

afterEach(async () => {
  await app.close();
});

async function start(): Promise<FastifyInstance> {
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent", MAP_TILES_PATH: TINY_ARCHIVE }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: null,
  });
  return app;
}

describe("compressed answers", () => {
  it("compresses a large answer for a phone that accepts it, and only then", async () => {
    await start();
    const zipped = await app.inject({
      method: "GET",
      url: "/v1/map/style.json",
      headers: { "accept-encoding": "gzip" },
    });
    expect(zipped.headers["content-encoding"]).toBe("gzip");
    const style = JSON.parse(gunzipSync(zipped.rawPayload).toString("utf8")) as { version: number };
    expect(style.version).toBe(8);
    expect(zipped.rawPayload.length).toBeLessThan(10_000);
    const plain = await app.inject({ method: "GET", url: "/v1/map/style.json" });
    expect(plain.headers["content-encoding"]).toBeUndefined();
  });

  it("leaves tiles as stored: compressed once, never twice", async () => {
    await start();
    const tile = await app.inject({
      method: "GET",
      url: "/v1/map/tiles/2/1/1",
      headers: { "accept-encoding": "gzip, br" },
    });
    expect(tile.headers["content-encoding"]).toBe("gzip");
    expect(gunzipSync(tile.rawPayload).length).toBeGreaterThan(100);
  });
});
