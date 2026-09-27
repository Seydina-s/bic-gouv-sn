// Map assets served by our API next to the vector tiles, so that no third party sees
// which part of the map people look at (CLAUDE.md §1): the glyphs of the labels (Noto
// Sans, SIL Open Font License) and the icons of the Protomaps basemap (derived from
// Mapzen's tangrams/icons, MIT). Each licence text is saved next to the files it covers.
//   pnpm map:assets     download them into .data/map (idempotent)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ASSETS = "https://raw.githubusercontent.com/protomaps/basemaps-assets/main";

/** Font stacks used by the Protomaps style. */
export const FONT_STACKS = ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"] as const;

/**
 * Glyph ranges of the Latin scripts written in Senegal (French, Wolof, Pulaar, Serer)
 * and of common punctuation: a label outside them shows without its missing letters.
 */
export const GLYPH_RANGES = [
  "0-255",
  "256-511",
  "512-767",
  "768-1023",
  "7680-7935",
  "8192-8447",
  "8448-8703",
] as const;

/** Icons of the light and dark flavours, at both pixel densities. */
const SPRITES = ["light", "dark"].flatMap((name) =>
  ["", "@2x"].flatMap((density) => [`${name}${density}.json`, `${name}${density}.png`]),
);

/** Licence texts, kept with the files they cover wherever those are deployed. */
const LICENSES = [
  { url: `${ASSETS}/fonts/OFL.txt`, folder: "glyphs", file: "OFL.txt" },
  {
    url: "https://raw.githubusercontent.com/tangrams/icons/master/LICENSE.md",
    folder: "sprites",
    file: "LICENSE.md",
  },
] as const;

const root = fileURLToPath(new URL("../.data/map/", import.meta.url));

async function download(url: string, target: string): Promise<void> {
  if (existsSync(target)) {
    return;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`${url}: HTTP ${String(response.status)}`);
  }
  writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

async function main(): Promise<void> {
  for (const stack of FONT_STACKS) {
    const folder = join(root, "glyphs", stack);
    mkdirSync(folder, { recursive: true });
    for (const range of GLYPH_RANGES) {
      await download(
        `${ASSETS}/fonts/${encodeURIComponent(stack)}/${range}.pbf`,
        join(folder, `${range}.pbf`),
      );
    }
  }
  const sprites = join(root, "sprites");
  mkdirSync(sprites, { recursive: true });
  for (const file of SPRITES) {
    await download(`${ASSETS}/sprites/v4/${file}`, join(sprites, file));
  }
  for (const { url, folder, file } of LICENSES) {
    await download(url, join(root, folder, file));
  }
  process.stdout.write(`Map assets ready in ${root}\n`);
}

// No top-level await: the root package is CommonJS.
main().catch((error: unknown) => {
  process.stdout.write(`Map assets: ${String(error)}\n`);
  process.exit(1);
});
