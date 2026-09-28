// Official PDFs of the stored history (linked in the text or attached apart by the
// source): `pnpm --filter @bgs/ingestion documents [fr|wo] [maxPages]`.
// Resumable: documents already stored are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { FileArticleRepository } from "@bgs/content-store";
import { langSchema } from "@bgs/shared-types";
import { backfillDocuments } from "../media/backfill-documents";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const lang = langSchema.parse(process.argv[2] ?? "fr");
const maxPages = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
const dataDir = new URL("../../../../.data/", import.meta.url);
const storePath = process.env["NEWS_STORE_PATH"] ?? fileURLToPath(new URL("news.json", dataDir));
const mediaRoot = process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("media", dataDir));

const result = await backfillDocuments(
  createPresidenceProvider(),
  new FileArticleRepository(storePath),
  new FileMediaStorage(mediaRoot),
  lang,
  {
    ...(maxPages === undefined ? {} : { maxPages }),
    onPage: ({ page, lastPage }) => {
      process.stdout.write(`[${lang}] page ${String(page)}/${String(lastPage)}\n`);
    },
  },
);

process.stdout.write(
  `Done: ${String(result.articles)} articles · ${String(result.attached)} documents · ${String(result.failures.length)} failed\n`,
);
for (const failure of result.failures) {
  process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
}
process.exitCode = result.failures.length > 0 ? 1 : 0;
