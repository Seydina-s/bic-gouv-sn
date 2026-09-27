import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { layers, namedFlavor } from "@protomaps/basemaps";
import { type ErrorCode, SENEGAL_BOUNDS } from "@bgs/shared-types";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { Compression, type DecompressFunc, PMTiles } from "pmtiles";
import { z } from "zod";
import { FileSource } from "../map/file-source";

export interface MapRoutesOptions {
  /** PMTiles archive of Senegal (vector tiles of OpenStreetMap, Protomaps schema). */
  tilesPath: string;
  /** Glyphs and sprites of the style (pnpm map:assets). */
  assetsRoot: string;
}

const MAX_ZOOM = 15;
/** ODbL: the credit links to OpenStreetMap's copyright page wherever the map shows. */
const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright">© les contributeurs d\'OpenStreetMap</a>';
/** Tiles change only when the archive is refreshed: a day fresh, a week stale. */
const TILE_CACHE = "public, max-age=86400, stale-while-revalidate=604800";
const ASSET_CACHE = "public, max-age=604800";
const UNAVAILABLE: ErrorCode = "MAP_UNAVAILABLE";
const FONT_STACK = /^[A-Za-z ]+$/;
const GLYPH_RANGE = /^\d{1,5}-\d{1,5}\.pbf$/;
const SPRITE = /^(?:light|dark)(?:@2x)?\.(?:json|png)$/;
/**
 * The map shows state services only, each one verified (CLAUDE.md §1): the base
 * map's own points of interest (shops, stadiums, post offices…) are left out.
 */
const BASE_POINTS = "pois";
/**
 * Tiles leave the archive as stored (gzip) under a content-encoding header: the
 * phone inflates them and the server never compresses anything. The library's
 * own cache still inflates the archive's directories.
 */
const keepAsStored: DecompressFunc = (buffer) => Promise.resolve(buffer);

/**
 * The map's base layer, served by our own API (tiles, style, glyphs, icons): no
 * third-party map service sees which part of the map people look at, and nothing
 * is billed per view (CLAUDE.md §4.1). A CDN serves these files in production.
 */
export const mapRoutes: FastifyPluginAsyncZod<MapRoutesOptions> = (
  app,
  { tilesPath, assetsRoot },
) => {
  const source = existsSync(tilesPath) ? new FileSource(tilesPath) : null;
  const archive = source === null ? null : new PMTiles(source, undefined, keepAsStored);
  app.addHook("onClose", async () => {
    await source?.close();
  });

  const unavailable = (request: { id: string }) => ({
    code: UNAVAILABLE,
    message: "Map tiles are not available",
    requestId: request.id,
  });

  app.get(
    "/map/style.json",
    {
      schema: {
        tags: ["map"],
        summary: "MapLibre style of the base map, in the app's light or dark theme",
        querystring: z.object({ theme: z.enum(["light", "dark"]).default("light") }),
      },
    },
    (request, reply) => {
      const base = `${request.protocol}://${request.host}/v1/map`;
      const { theme } = request.query;
      void reply.header("cache-control", "public, max-age=3600");
      return {
        version: 8,
        glyphs: `${base}/glyphs/{fontstack}/{range}.pbf`,
        sprite: `${base}/sprites/${theme}`,
        sources: {
          protomaps: {
            type: "vector",
            tiles: [`${base}/tiles/{z}/{x}/{y}`],
            minzoom: 0,
            maxzoom: MAX_ZOOM,
            // The archive covers Senegal with a margin, like the services themselves.
            bounds: SENEGAL_BOUNDS,
            attribution: ATTRIBUTION,
          },
        },
        layers: layers("protomaps", namedFlavor(theme), { lang: "fr" }).filter(
          (layer) => !("source-layer" in layer) || layer["source-layer"] !== BASE_POINTS,
        ),
      };
    },
  );

  app.get(
    "/map/tiles/:z/:x/:y",
    {
      schema: {
        tags: ["map"],
        summary: "One vector tile of the base map",
        params: z.object({
          z: z.coerce.number().int().min(0).max(MAX_ZOOM),
          x: z.coerce.number().int().min(0),
          y: z.coerce.number().int().min(0),
        }),
      },
    },
    async (request, reply) => {
      if (archive === null) {
        return reply.code(503).send(unavailable(request));
      }
      const { z: zoom, x, y } = request.params;
      const tile = await archive.getZxy(zoom, x, y);
      if (tile === undefined) {
        // Outside the archive, or an empty sea tile: nothing to draw.
        return reply.code(204).header("cache-control", TILE_CACHE).send();
      }
      const header = await archive.getHeader();
      void reply
        .header("content-type", "application/vnd.mapbox-vector-tile")
        .header("cache-control", TILE_CACHE);
      if (header.tileCompression === Compression.Gzip) {
        void reply.header("content-encoding", "gzip");
      }
      return reply.send(Buffer.from(tile.data));
    },
  );

  app.get(
    "/map/glyphs/:fontstack/:range",
    {
      schema: {
        tags: ["map"],
        summary: "Glyphs of the map labels (PBF)",
        params: z.object({ fontstack: z.string().max(200), range: z.string().max(20) }),
      },
    },
    async (request, reply) => {
      // A layer may ask for several stacks ("A,B"): the first one we have answers.
      const stack = request.params.fontstack
        .split(",")
        .map((name) => name.trim())
        .find((name) => FONT_STACK.test(name) && existsSync(join(assetsRoot, "glyphs", name)));
      const { range } = request.params;
      if (stack === undefined || !GLYPH_RANGE.test(range)) {
        return reply.code(404).send();
      }
      const file = join(assetsRoot, "glyphs", stack, range);
      if (!existsSync(file)) {
        return reply.code(404).send();
      }
      return reply
        .header("content-type", "application/x-protobuf")
        .header("cache-control", ASSET_CACHE)
        .send(await readFile(file));
    },
  );

  app.get(
    "/map/sprites/:file",
    {
      schema: {
        tags: ["map"],
        summary: "Icons of the base map (sprite sheet and its index)",
        params: z.object({ file: z.string().max(40) }),
      },
    },
    async (request, reply) => {
      const { file } = request.params;
      const path = join(assetsRoot, "sprites", file);
      if (!SPRITE.test(file) || !existsSync(path)) {
        return reply.code(404).send();
      }
      return reply
        .header("content-type", file.endsWith(".png") ? "image/png" : "application/json")
        .header("cache-control", ASSET_CACHE)
        .send(await readFile(path));
    },
  );

  return Promise.resolve();
};
