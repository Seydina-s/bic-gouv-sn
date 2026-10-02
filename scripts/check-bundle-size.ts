// Fails when the mobile app exceeds its weight budget (S1-03, revised 26/09/2026),
// or ships one package in two builds (ES module and CommonJS): both then run, and a
// native library registers its views twice and crashes the app at launch (MapLibre,
// ERREURS.md, 02/10/2026). Run after `pnpm --filter @bgs/mobile bundle:check`
// (which exports the source maps read here): `pnpm bundle:size`.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MB = 1024 * 1024;
/**
 * JavaScript (Hermes bytecode): what delays startup on a 2 GB Android phone,
 * so it keeps its own ceiling.
 */
// 7.5 MB since 30/09/2026 (user decision): the fluid sliding panel of "Près de moi"
// (Reanimated, gesture handler) adds about 1.2 MB. The target stays 4 MB (PERF-03).
const CODE_BUDGET_BYTES = 7.5 * MB;
/**
 * Whole app content shipped in the bundle (code + fonts, illustrations, animations):
 * raised to 15 MB by the user for an immersive experience (decisions.md, 26/09/2026).
 */
const TOTAL_BUDGET_BYTES = 15 * MB;

interface Metadata {
  fileMetadata: Record<string, { bundle: string; assets: { path: string }[] }>;
}

const dist = fileURLToPath(new URL("../apps/mobile/dist/", import.meta.url));
const sizeOf = (path: string) => statSync(join(dist, path.replaceAll("\\", "/"))).size;

let metadata: Metadata;
try {
  metadata = JSON.parse(readFileSync(join(dist, "metadata.json"), "utf8")) as Metadata;
} catch {
  process.stdout.write("No export found: run the mobile bundle:check first.\n");
  process.exit(1);
}

/** Folder names of the two builds a package may ship, ES module or CommonJS. */
const BUILD_FOLDER = /^(?:(?:lib|dist|build)\/)?(module|esm|es|mjs|commonjs|cjs)(?:\/|$)/;
const ES_BUILDS = new Set(["module", "esm", "es", "mjs"]);

/** Packages whose ES module and CommonJS builds are both in the bundle. */
export function packagesInTwoBuilds(sources: readonly string[]): string[] {
  const kinds = new Map<string, Set<"es" | "cjs">>();
  for (const source of sources.map((one) => one.replaceAll("\\", "/"))) {
    const start = source.lastIndexOf("node_modules/");
    if (start < 0) {
      continue;
    }
    const parts = source.slice(start + "node_modules/".length).split("/");
    const scoped = parts[0]?.startsWith("@") === true;
    const name = parts.slice(0, scoped ? 2 : 1).join("/");
    const build = BUILD_FOLDER.exec(parts.slice(scoped ? 2 : 1).join("/"))?.[1];
    if (build !== undefined) {
      const found = kinds.get(name) ?? new Set();
      found.add(ES_BUILDS.has(build) ? "es" : "cjs");
      kinds.set(name, found);
    }
  }
  return [...kinds].filter(([, found]) => found.size > 1).map(([name]) => name);
}

const mb = (bytes: number) => (bytes / MB).toFixed(2);
let over = false;
for (const [platform, { bundle, assets }] of Object.entries(metadata.fileMetadata)) {
  const code = sizeOf(bundle);
  const total = code + assets.reduce((sum, asset) => sum + sizeOf(asset.path), 0);
  const codeOk = code <= CODE_BUDGET_BYTES;
  const totalOk = total <= TOTAL_BUDGET_BYTES;
  over ||= !codeOk || !totalOk;
  process.stdout.write(
    `${codeOk && totalOk ? "ok  " : "OVER"} ${platform}: code ${mb(code)} / ${mb(CODE_BUDGET_BYTES)} MB · total ${mb(total)} / ${mb(TOTAL_BUDGET_BYTES)} MB\n`,
  );
  const map = JSON.parse(
    readFileSync(join(dist, `${bundle.replaceAll("\\", "/")}.map`), "utf8"),
  ) as {
    sources: string[];
  };
  const twice = packagesInTwoBuilds(map.sources);
  over ||= twice.length > 0;
  process.stdout.write(
    twice.length === 0
      ? `ok   ${platform}: each package in one build only\n`
      : `TWICE ${platform}: ${twice.join(", ")} (import it everywhere, never require the package)\n`,
  );
}
process.exitCode = over ? 1 : 0;
