import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

// Three tiles (zoom 0 to 2) cut from the Senegal archive: OpenStreetMap data, ODbL.
const TINY_ARCHIVE = fileURLToPath(
  new URL("../testing/fixtures/senegal-z0-2.pmtiles", import.meta.url),
);

let assets: string;
let app: FastifyInstance;

async function start(tilesPath: string): Promise<void> {
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent", MAP_TILES_PATH: tilesPath, MAP_ASSETS_ROOT: assets }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: null,
  });
}

beforeEach(() => {
  assets = mkdtempSync(join(tmpdir(), "bgs-map-"));
  mkdirSync(join(assets, "glyphs", "Noto Sans Regular"), { recursive: true });
  writeFileSync(join(assets, "glyphs", "Noto Sans Regular", "0-255.pbf"), Buffer.from([1, 2, 3]));
  mkdirSync(join(assets, "sprites"), { recursive: true });
  writeFileSync(join(assets, "sprites", "light.json"), "{}");
});

afterEach(async () => {
  await app.close();
  rmSync(assets, { recursive: true, force: true });
});

describe("base map", () => {
  it("describes a style whose tiles, glyphs and icons all come from our API, without the base map's places of interest", async () => {
    await start(TINY_ARCHIVE);
    const light = await app.inject({
      method: "GET",
      url: "/v1/map/style.json",
      headers: { host: "api.test" },
    });
    const style = light.json<{
      glyphs: string;
      sprite: string;
      sources: { protomaps: { tiles: string[]; attribution: string } };
      layers: { id: string; "source-layer"?: string; paint?: Record<string, unknown> }[];
    }>();
    expect(style.sources.protomaps.tiles).toEqual(["http://api.test/v1/map/tiles/{z}/{x}/{y}"]);
    expect(style.glyphs).toBe("http://api.test/v1/map/glyphs/{fontstack}/{range}.pbf");
    expect(style.sprite).toBe("http://api.test/v1/map/sprites/light");
    expect(style.sources.protomaps.attribution).toContain("les contributeurs d'OpenStreetMap");
    expect(style.sources.protomaps.attribution).toContain(
      "https://www.openstreetmap.org/copyright",
    );
    expect(style.layers.length).toBeGreaterThan(20);
    // Only verified state services are drawn as places: none of the base map's own.
    expect(style.layers.filter((layer) => layer["source-layer"] === "pois")).toEqual([]);
    expect(style.layers.some((layer) => layer["source-layer"] === "places")).toBe(true);
    const dark = await app.inject({ method: "GET", url: "/v1/map/style.json?theme=dark" });
    const background = (body: typeof style) =>
      body.layers.find((layer) => layer.id === "background")?.paint?.["background-color"];
    expect(background(dark.json())).not.toEqual(background(style));
  });

  it("serves the archive's tiles, compressed, and nothing outside it", async () => {
    await start(TINY_ARCHIVE);
    const tile = await app.inject({ method: "GET", url: "/v1/map/tiles/2/1/1" });
    expect(tile.statusCode).toBe(200);
    expect(tile.headers["content-type"]).toBe("application/vnd.mapbox-vector-tile");
    expect(tile.headers["content-encoding"]).toBe("gzip");
    // The header must tell the truth: a browser refuses a body it cannot inflate.
    expect(gunzipSync(tile.rawPayload).length).toBeGreaterThan(100);
    expect((await app.inject({ method: "GET", url: "/v1/map/tiles/2/3/3" })).statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: "/v1/map/tiles/16/0/0" })).statusCode).toBe(400);
  });

  it("says plainly when the archive is missing", async () => {
    await start(join(assets, "absent.pmtiles"));
    const response = await app.inject({ method: "GET", url: "/v1/map/tiles/0/0/0" });
    expect(response.statusCode).toBe(503);
    expect(response.json<{ code: string }>().code).toBe("MAP_UNAVAILABLE");
  });

  it("serves only the glyphs and icons it knows, never a path outside its folder", async () => {
    await start(TINY_ARCHIVE);
    const glyphs = await app.inject({
      method: "GET",
      url: "/v1/map/glyphs/Noto%20Sans%20Regular,Noto%20Sans%20Medium/0-255.pbf",
    });
    expect(glyphs.statusCode).toBe(200);
    expect(glyphs.rawPayload).toEqual(Buffer.from([1, 2, 3]));
    expect(
      (await app.inject({ method: "GET", url: "/v1/map/sprites/light.json" })).statusCode,
    ).toBe(200);
    for (const url of [
      "/v1/map/glyphs/..%2F..%2Fsecret/0-255.pbf",
      "/v1/map/glyphs/Noto%20Sans%20Regular/..%2F..%2Fx.pbf",
      "/v1/map/sprites/..%2Fglyphs",
      "/v1/map/sprites/light.svg",
    ]) {
      expect((await app.inject({ method: "GET", url })).statusCode).toBe(404);
    }
  });
});
