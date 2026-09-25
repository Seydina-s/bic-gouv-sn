// Manual run: `pnpm --filter @bgs/ingestion collect [fr|wo] [limit]` (default fr 8).
// Articles are stored in NEWS_STORE_PATH (default: <repo>/.data/news.json).
import { fileURLToPath } from "node:url";
import { FileArticleRepository } from "@bgs/content-store";
import { langSchema } from "@bgs/shared-types";
import { ingestLatest } from "../ingest";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const lang = langSchema.parse(process.argv[2] ?? "fr");
const limit = Math.min(Math.max(Number(process.argv[3] ?? 8) || 8, 1), 8);
const storePath =
  process.env["NEWS_STORE_PATH"] ??
  fileURLToPath(new URL("../../../../.data/news.json", import.meta.url));

const report = await ingestLatest(
  createPresidenceProvider(),
  new FileArticleRepository(storePath),
  lang,
  limit,
);

const { created, updated, unchanged } = report.outcomes;
const lines = [
  `[${lang}] created ${String(created)}, updated ${String(updated)}, unchanged ${String(unchanged)}, failed ${String(report.failures.length)} → ${storePath}`,
  ...report.failures.map((failure) => `  ✗ ${failure.code} ${failure.ref}: ${failure.message}`),
];
process.stdout.write(`${lines.join("\n")}\n`);
process.exitCode = report.failures.length > 0 ? 1 : 0;
