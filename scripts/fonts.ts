// Latin-only subsets of the app fonts (PERF-04): the Google Fonts files also carry
// Cyrillic, Greek and Vietnamese, which the app never shows.
//   pnpm fonts          regenerate apps/mobile/assets/fonts (and the console's web fonts
//                       in apps/admin/src/fonts) from the font packages
//   pnpm fonts:check    fail if a committed font lacks a French or Wolof letter
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

/**
 * The faces declared in the design tokens (packages/ui fontFace), by package: Noto
 * Sans and Noto Serif, chosen by the user on 27/09/2026 (S1-04).
 */
const FACES = [
  ["noto-sans", "400Regular", "NotoSans_400Regular"],
  ["noto-sans", "600SemiBold", "NotoSans_600SemiBold"],
  ["noto-sans", "700Bold", "NotoSans_700Bold"],
  ["noto-sans", "800ExtraBold", "NotoSans_800ExtraBold"],
  ["noto-serif", "600SemiBold", "NotoSerif_600SemiBold"],
  ["noto-serif", "700Bold", "NotoSerif_700Bold"],
] as const;

/**
 * Kept: Basic Latin, Latin-1, Latin Extended-A and B (Wolof, Pulaar, Serer…),
 * combining accents, punctuation (non-breaking and narrow spaces, quotes, dashes),
 * currency and letterlike symbols.
 */
const KEPT_RANGES: [number, number][] = [
  [0x20, 0x7e],
  [0xa0, 0x24f],
  // ɓ and ɗ of Pulaar and Serer sit in the IPA block: only these two are kept.
  [0x253, 0x253],
  [0x257, 0x257],
  [0x300, 0x36f],
  [0x2000, 0x206f],
  [0x20a0, 0x20cf],
  [0x2100, 0x2122],
];

/**
 * Letters every face must draw (CLAUDE.md: all Wolof characters), as code points:
 * French accents and ligatures, Wolof (ë é à ó ñ ŋ), French quotes, apostrophe,
 * ellipsis, dashes and the non-breaking space used before « : ; ? ! ». Since the
 * Noto faces (27/09/2026), also the hooked letters of Pulaar and Serer (Ɓ ɓ Ɗ ɗ
 * Ƴ ƴ) and the narrow non-breaking space: every language of the country is drawn.
 */
const REQUIRED = [
  0xe0, 0xe2, 0xe7, 0xe8, 0xe9, 0xea, 0xeb, 0xee, 0xef, 0xf3, 0xf4, 0xf9, 0xfb, 0xfc, 0xff, 0x153,
  0xe6, 0xc0, 0xc2, 0xc7, 0xc8, 0xc9, 0xca, 0xcb, 0xce, 0xcf, 0xd3, 0xd4, 0xd9, 0xdb, 0xdc, 0x152,
  0xf1, 0xd1, 0x14b, 0x14a, 0xab, 0xbb, 0x2019, 0x2026, 0xa0, 0x2013, 0x2014, 0x181, 0x253, 0x18a,
  0x257, 0x1b3, 0x1b4, 0x202f,
];

const root = fileURLToPath(new URL("..", import.meta.url));
const outDir = join(root, "apps/mobile/assets/fonts");
/** The console builds with these files: no request to Google Fonts at build time. */
const consoleDir = join(root, "apps/admin/src/fonts");
const CONSOLE_FACES: ReadonlySet<string> = new Set([
  "NotoSans_400Regular",
  "NotoSans_600SemiBold",
  "NotoSans_700Bold",
  "NotoSans_800ExtraBold",
]);
const requireFromMobile = createRequire(join(root, "apps/mobile/package.json"));

function keptText(): string {
  let text = "";
  for (const [first, last] of KEPT_RANGES) {
    for (let code = first; code <= last; code += 1) {
      text += String.fromCodePoint(code);
    }
  }
  return text;
}

async function missingLetters(font: Uint8Array): Promise<string[]> {
  // Loaded on demand: harfbuzzjs is an ES module with top-level await (root is CommonJS).
  const { Blob, Face } = await import("harfbuzzjs");
  const supported = new Set(new Face(new Blob(font)).collectUnicodes());
  return REQUIRED.filter((code) => !supported.has(code)).map(
    (code) => `U+${code.toString(16).toUpperCase().padStart(4, "0")}`,
  );
}

async function generate(): Promise<void> {
  mkdirSync(outDir, { recursive: true });
  const text = keptText();
  for (const [pkg, weight, name] of FACES) {
    const source = readFileSync(
      requireFromMobile.resolve(`@expo-google-fonts/${pkg}/${weight}/${name}.ttf`),
    );
    const subset = await subsetFont(source, text, { targetFormat: "truetype" });
    writeFileSync(join(outDir, `${name}.ttf`), subset);
    if (CONSOLE_FACES.has(name)) {
      mkdirSync(consoleDir, { recursive: true });
      const web = await subsetFont(source, text, { targetFormat: "woff2" });
      writeFileSync(join(consoleDir, `${name}.woff2`), web);
    }
    process.stdout.write(`${name}: ${String(source.length)} -> ${String(subset.length)} bytes\n`);
  }
}

async function check(): Promise<void> {
  let failed = false;
  for (const [, , name] of FACES) {
    const missing = await missingLetters(readFileSync(join(outDir, `${name}.ttf`)));
    if (missing.length > 0) {
      failed = true;
      process.stdout.write(`${name} lacks ${missing.join(", ")}\n`);
    }
  }
  process.stdout.write(failed ? "Fonts: letters missing.\n" : "Fonts: every letter present.\n");
  process.exit(failed ? 1 : 0);
}

// No top-level await: the root package is CommonJS.
(process.argv.includes("--check") ? check() : generate().then(check)).catch((error: unknown) => {
  process.stdout.write(`Fonts: ${String(error)}\n`);
  process.exit(1);
});
