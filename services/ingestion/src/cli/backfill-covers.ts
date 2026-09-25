// Cover photos of the stored history: `pnpm --filter @bgs/ingestion covers [fr|wo] [maxPages]`.
// Resumable: covers already attached are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { FileArticleRepository } from "@bgs/content-store";
import { langSchema } from "@bgs/shared-types";
import { backfillCovers } from "../media/backfill-covers";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const lang = langSchema.parse(process.argv[2] ?? "fr");
const maxPages = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
const dataDir = new URL("../../../../.data/", import.meta.url);
const storePath = process.env["NEWS_STORE_PATH"] ?? fileURLToPath(new URL("news.json", dataDir));
const mediaRoot = process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("media", dataDir));

const result = await backfillCovers(
  createPresidenceProvider(),
  new FileArticleRepository(storePath),
  new FileMediaStorage(mediaRoot),
  lang,
  {
    ...(maxPages === undefined ? {} : { maxPages }),
    onPage: (p) => {
      const o = p.outcomes;
      process.stdout.write(
        `[${lang}] page ${String(p.page)}/${String(p.lastPage)} · attached ${String(o.attached)} · already ${String(o["already-done"])} · none ${String(o["no-cover"])} · failed ${String(p.failures.length)}\n`,
      );
    },
  },
);

for (const failure of result.failures) {
  process.stdout.write(`  ✗ ${failure.code} ${failure.ref}: ${failure.message}\n`);
}
process.exitCode = result.failures.length > 0 ? 1 : 0;
