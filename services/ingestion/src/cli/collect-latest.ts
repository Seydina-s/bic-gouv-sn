// Manual run: `pnpm --filter @bgs/ingestion collect [limit]` (default 8, max one page).
import { collectLatest } from "../collect";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const limit = Math.min(Math.max(Number(process.argv[2] ?? 8) || 8, 1), 8);
const report = await collectLatest(createPresidenceProvider(), "fr", limit);

const lines = [
  `Collected ${String(report.articles.length)} article(s), ${String(report.failures.length)} failure(s).`,
  ...report.articles.map(
    (article) =>
      `  ✓ ${article.sourcePublishedOn ?? "????-??-??"} [${article.category}] ${article.translations[0]?.title ?? ""}`,
  ),
  ...report.failures.map((failure) => `  ✗ ${failure.code} ${failure.ref}: ${failure.message}`),
];
process.stdout.write(`${lines.join("\n")}\n`);
process.exitCode = report.failures.length > 0 ? 1 : 0;
