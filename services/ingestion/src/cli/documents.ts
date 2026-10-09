// Official PDFs of the stored history (linked in the text or attached apart by the
// source): `pnpm --filter @bgs/ingestion documents [fr|wo] [maxPages] [--source primature]`.
// Resumable: documents already stored are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { langSchema } from "@bgs/shared-types";
import { openStores } from "../lib/stores";
import { backfillDocuments } from "../media/backfill-documents";
import { FileMediaStorage } from "../media/media-storage";
import { NEWS_SOURCES, positionalArguments, sourceOption } from "../sources/news-sources";

const [langArgument, pagesArgument] = positionalArguments(process.argv);
const lang = langSchema.parse(langArgument ?? "fr");
const maxPages = pagesArgument === undefined ? undefined : Number(pagesArgument);
const source = sourceOption(process.argv);
const mediaRoot =
  process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("../../../../.data/media", import.meta.url));
const { stores, close } = await openStores();

try {
  const result = await backfillDocuments(
    NEWS_SOURCES[source](),
    stores.articles,
    new FileMediaStorage(mediaRoot),
    lang,
    {
      ...(maxPages === undefined ? {} : { maxPages }),
      onPage: ({ page, lastPage }) => {
        process.stdout.write(`[${source} ${lang}] page ${String(page)}/${String(lastPage)}\n`);
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
} finally {
  await close();
}
