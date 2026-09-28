// Articles the source no longer publishes, as a read-only report (ING-03):
// `pnpm --filter @bgs/ingestion withdrawn`. Nothing is hidden or changed.
// ~1 request per second: the whole listing of each language, then one per missing article.
import { fileURLToPath } from "node:url";
import { FileArticleRepository } from "@bgs/content-store";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";
import { findWithdrawn } from "../withdrawn";

const dataDir = new URL("../../../../.data/", import.meta.url);
const storePath = process.env["NEWS_STORE_PATH"] ?? fileURLToPath(new URL("news.json", dataDir));

const missing = await findWithdrawn(
  createPresidenceProvider(),
  new FileArticleRepository(storePath),
  ["fr", "wo"],
);

const count = (check: string) => String(missing.filter((entry) => entry.check === check).length);
process.stdout.write(
  `Missing from the listing: ${String(missing.length)} · withdrawn ${count("withdrawn")} · still published ${count("still-published")} · unconfirmed ${count("unconfirmed")}\n`,
);
for (const entry of missing) {
  process.stdout.write(`  ${entry.check} [${entry.lang}] ${entry.sourceUrl}\n`);
}
