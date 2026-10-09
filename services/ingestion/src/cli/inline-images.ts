// Images placed in the text of stored articles: `pnpm --filter @bgs/ingestion inline-images`.
// Resumable: images already stored are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { openStores } from "../lib/stores";
import { attachInlineImages } from "../media/attach-inline";
import { backfillMedia } from "../media/backfill-media";
import { FileMediaStorage } from "../media/media-storage";
import { createNewsProviders } from "../sources/news-sources";

const mediaRoot =
  process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("../../../../.data/media", import.meta.url));
const REPORT_EVERY = 25;
const providers = createNewsProviders();
const { stores, close } = await openStores();

try {
  const result = await backfillMedia(
    attachInlineImages,
    (article) => providers[article.publisher],
    stores.articles,
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
} finally {
  await close();
}
