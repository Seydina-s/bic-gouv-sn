// Full history import: `pnpm --filter @bgs/ingestion backfill [fr|wo] [maxPages]`.
// Resumable: re-running skips what is already stored. ~1 request per second.
// Into PostgreSQL when DATABASE_URL is set, else into .data/news.json.
import { langSchema } from "@bgs/shared-types";
import { backfill } from "../backfill";
import { openStores } from "../lib/stores";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const lang = langSchema.parse(process.argv[2] ?? "fr");
const maxPages = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
const { stores, close } = await openStores();

try {
  const result = await backfill(createPresidenceProvider(), stores.articles, lang, {
    ...(maxPages === undefined ? {} : { maxPages }),
    onPage: (p) => {
      process.stdout.write(
        `[${lang}] page ${String(p.page)}/${String(p.lastPage)} · created ${String(p.created)} · updated ${String(p.updated)} · skipped ${String(p.skipped)} · failed ${String(p.failures.length)}\n`,
      );
    },
  });
  for (const failure of result.failures) {
    process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
  }
  process.exitCode = result.failures.length > 0 ? 1 : 0;
} finally {
  await close();
}
