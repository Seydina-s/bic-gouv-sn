// Map markers of "Près de moi" (user decision, 30/09/2026): one per kind of state
// service, its tone and its icon (the same Phosphor icon as in the list), with a
// white ring. Drawn at 1x, 2x and 3x for every screen density.
//   pnpm map:markers   regenerate apps/mobile/assets/map-markers/
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { lightServiceTones, type ServiceKind } from "../packages/ui/src/tokens/service-tones";
import sharp from "sharp";

const repo = fileURLToPath(new URL("..", import.meta.url));
const out = join(repo, "apps/mobile/assets/map-markers");
// The app's own copy of Phosphor (its package exports hide package.json).
const phosphor = join(repo, "apps/mobile/node_modules/phosphor-react-native");

/** The icon of each kind: the same as SERVICE_ICONS in the app's list. */
const ICONS: Record<ServiceKind, string> = {
  mairie: "Bank",
  prefecture: "Flag",
  police: "ShieldCheck",
  gendarmerie: "ShieldStar",
  tribunal: "Scales",
  ministere: "Buildings",
  administration: "Briefcase",
};

/** Marker diameter in density-independent pixels, and its parts. */
const SIZE = 32;
const RING = 2;
const ICON = 18;

/** The paths of an icon's filled weight, read from Phosphor's generated file. */
function filledPaths(icon: string): string[] {
  const source = readFileSync(join(phosphor, "src/defs", `${icon}.tsx`), "utf8");
  const start = source.indexOf("'fill',");
  const end = source.indexOf("],", start);
  const paths = [...source.slice(start, end).matchAll(/d="([^"]+)"/g)].map((match) => match[1]);
  if (start < 0 || paths.length === 0) {
    throw new Error(`No filled weight for ${icon}`);
  }
  return paths.filter((path): path is string => path !== undefined);
}

function markerSvg(color: string, paths: readonly string[]): string {
  const half = SIZE / 2;
  const scale = ICON / 256;
  const offset = (SIZE - ICON) / 2;
  const icon = paths.map((d) => `<path d="${d}" fill="#FFFFFF"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${String(SIZE)}" height="${String(SIZE)}" viewBox="0 0 ${String(SIZE)} ${String(SIZE)}">
  <circle cx="${String(half)}" cy="${String(half)}" r="${String(half - RING / 2)}" fill="${color}" stroke="#FFFFFF" stroke-width="${String(RING)}"/>
  <g transform="translate(${String(offset)} ${String(offset)}) scale(${String(scale)})">${icon}</g>
</svg>`;
}

async function main(): Promise<void> {
  mkdirSync(out, { recursive: true });
  for (const [kind, icon] of Object.entries(ICONS)) {
    const tone = lightServiceTones[kind as ServiceKind];
    const svg = Buffer.from(markerSvg(tone.marker, filledPaths(icon)));
    for (const density of [1, 2, 3]) {
      const suffix = density === 1 ? "" : `@${String(density)}x`;
      await sharp(svg, { density: 72 * density })
        .png({ compressionLevel: 9 })
        .toFile(join(out, `${kind}${suffix}.png`));
    }
  }
  process.stdout.write(`${String(Object.keys(ICONS).length)} markers written to ${out}\n`);
}

void main();
