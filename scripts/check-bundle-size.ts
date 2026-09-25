// Fails when a mobile JS bundle (Hermes bytecode) exceeds the weight budget (S1-03).
// Run after `pnpm --filter @bgs/mobile bundle:check`: `pnpm bundle:size`.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Ceiling enforced in CI; the target after PERF-03 (Sentry replay, Zod) is 4 MB. */
const BUDGET_BYTES = 6 * 1024 * 1024;

const root = fileURLToPath(new URL("../apps/mobile/dist/_expo/static/js/", import.meta.url));
const bundles = readdirSync(root).flatMap((platform) =>
  readdirSync(join(root, platform))
    .filter((file) => file.endsWith(".hbc") || file.endsWith(".js"))
    .map((file) => ({ platform, file, bytes: statSync(join(root, platform, file)).size })),
);

let over = false;
for (const { platform, file, bytes } of bundles) {
  const ok = bytes <= BUDGET_BYTES;
  over ||= !ok;
  process.stdout.write(
    `${ok ? "ok  " : "OVER"} ${platform}/${file}: ${(bytes / 1024 / 1024).toFixed(2)} MB / ${(BUDGET_BYTES / 1024 / 1024).toFixed(0)} MB\n`,
  );
}
if (bundles.length === 0) {
  process.stdout.write("No bundle found: run the mobile bundle:check first.\n");
}
process.exitCode = over || bundles.length === 0 ? 1 : 0;
