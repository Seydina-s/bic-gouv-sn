// Fails when the mobile app exceeds its weight budget (S1-03, revised 26/09/2026).
// Run after `pnpm --filter @bgs/mobile bundle:check`: `pnpm bundle:size`.
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MB = 1024 * 1024;
/**
 * JavaScript (Hermes bytecode): what delays startup on a 2 GB Android phone,
 * so it keeps its own ceiling.
 */
const CODE_BUDGET_BYTES = 6 * MB;
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
}
process.exitCode = over ? 1 : 0;
