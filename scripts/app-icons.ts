// The app's icons, from the official BIC-GOUV icon (the flag's three bands and its
// star, apps/mobile/assets/brand/icon-source.svg, supplied by the owner on
// 03/10/2026): iPhone and store icon, Android adaptive icon (foreground, background,
// themed monochrome), native launch screen, notification icon, web favicon, and
// the console's favicon. The mark is used as supplied, never redrawn.
//   pnpm app:icons   regenerate them
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repo = fileURLToPath(new URL("..", import.meta.url));
const assets = join(repo, "apps/mobile/assets");
const source = readFileSync(join(assets, "brand/icon-source.svg"), "utf8");

/** The source's own drawing area. */
const [width, height] = (/viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(source) ?? [])
  .slice(1)
  .map(Number) as [number, number];
const inner = source.slice(
  source.indexOf(">", source.indexOf("<svg")) + 1,
  source.lastIndexOf("</svg>"),
);

/** The bands and the star as one shape, the star cut out (one-colour icons). */
function silhouettePath(): string {
  const rects = [...source.matchAll(/<rect[^>]*>/g)].map(([tag]) => {
    // A missing x or y is 0, as in SVG.
    const attr = (name: string) => new RegExp(`\\s${name}="([\\d.]+)"`).exec(tag)?.[1] ?? "0";
    const w = attr("width");
    return `M${attr("x")} ${attr("y")}h${w}v${attr("height")}h-${w}Z`;
  });
  const stars = [...source.matchAll(/<polygon[^>]*points="([^"]+)"/g)].map(([, points]) => {
    const numbers = (points ?? "").trim().split(/\s+/);
    const pairs = numbers.flatMap((x, i) => (i % 2 === 0 ? [`${x} ${numbers[i + 1] ?? ""}`] : []));
    return `M${pairs.join("L")}Z`;
  });
  return [...rects, ...stars].join("");
}

/** The mark `markHeight` tall, centred on a `size` square, on `background` or none. */
function square(size: number, markHeight: number, mark: string, background?: string): string {
  const markWidth = (markHeight * width) / height;
  const s = String(size);
  const x = String((size - markWidth) / 2);
  const y = String((size - markHeight) / 2);
  const w = String(markWidth);
  const h = String(markHeight);
  const box = `0 0 ${String(width)} ${String(height)}`;
  const fill =
    background === undefined ? "" : `<rect width="${s}" height="${s}" fill="${background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${fill}<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${box}">${mark}</svg></svg>`;
}

const colour = inner;
const shape = (color: string) =>
  `<path d="${silhouettePath()}" fill="${color}" fill-rule="evenodd"/>`;

/**
 * Sizes, in pixels of a 1024 square unless said otherwise. Android masks its
 * adaptive icon and its launch icon to a circle of about 61 % of the square: the
 * tall mark keeps its corners inside it at 520 px.
 */
const IN_CIRCLE = 520;
const ICONS: { file: string; svg: string }[] = [
  // iPhone and stores: opaque, square, the phone rounds the corners.
  { file: "icon.png", svg: square(1024, 720, colour, "#FFFFFF") },
  { file: "android-icon-foreground.png", svg: square(1024, IN_CIRCLE, colour) },
  { file: "android-icon-background.png", svg: square(1024, 0, "", "#FFFFFF") },
  { file: "android-icon-monochrome.png", svg: square(1024, IN_CIRCLE, shape("#000000")) },
  { file: "splash-icon.png", svg: square(1024, IN_CIRCLE, colour) },
  // Android draws it in one colour: white on transparent, the star cut out.
  { file: "notification-icon.png", svg: square(96, 80, shape("#FFFFFF")) },
  { file: "favicon.png", svg: square(48, 44, colour) },
];

async function main() {
  for (const { file, svg } of ICONS) {
    await sharp(Buffer.from(svg)).png().toFile(join(assets, file));
  }
  // The console's favicon stays a vector (Next.js serves app/icon.svg).
  writeFileSync(join(repo, "apps/admin/src/app/icon.svg"), `${square(64, 60, colour)}\n`);
  process.stdout.write(`${String(ICONS.length + 1)} icons written\n`);
}

void main();
