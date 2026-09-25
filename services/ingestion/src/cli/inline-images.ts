// Images placed in the text of stored articles: `pnpm --filter @bgs/ingestion inline-images`.
// Resumable: images already stored are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { FileArticleRepository } from "@bgs/content-store";
import { backfillInlineImages } from "../media/backfill-inline";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const dataDir = new URL("../../../../.data/", import.meta.url);
const storePath = process.env["NEWS_STORE_PATH"] ?? fileURLToPath(new URL("news.json", dataDir));
const mediaRoot = process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("media", dataDir));

const REPORT_EVERY = 25;

const result = await backfillInlineImages(
  createPresidenceProvider(),
  new FileArticleRepository(storePath),
  new FileMediaStorage(mediaRoot),
  (p) => {
    if (p.articles % REPORT_EVERY === 0) {
      process.stdout.write(
        `${String(p.articles)} articles · ${String(p.attached)} images · ${String(p.failures.length)} failed\n`,
      );
    }
  },
);

process.stdout.write(
  `Done: ${String(result.articles)} articles · ${String(result.attached)} images · ${String(result.failures.length)} failed\n`,
);
for (const failure of result.failures) {
  process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
}
process.exitCode = result.failures.length > 0 ? 1 : 0;
