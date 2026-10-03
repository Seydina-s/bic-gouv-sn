// Cover photos of the stored history: `pnpm --filter @bgs/ingestion covers [fr|wo] [maxPages]`.
// Resumable: covers already attached are skipped. ~1 request per second.
import { fileURLToPath } from "node:url";
import { langSchema } from "@bgs/shared-types";
import { openStores } from "../lib/stores";
import { backfillCovers } from "../media/backfill-covers";
import { FileMediaStorage } from "../media/media-storage";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";

const lang = langSchema.parse(process.argv[2] ?? "fr");
const maxPages = process.argv[3] === undefined ? undefined : Number(process.argv[3]);
const mediaRoot =
  process.env["MEDIA_ROOT"] ?? fileURLToPath(new URL("../../../../.data/media", import.meta.url));
const { stores, close } = await openStores();

try {
  const result = await backfillCovers(
    createPresidenceProvider(),
    stores.articles,
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
} finally {
  await close();
}
