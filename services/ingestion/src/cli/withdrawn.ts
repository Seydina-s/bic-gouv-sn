// Articles the source withdrew (ING-03): `pnpm --filter @bgs/ingestion withdrawn`
// hides them (and shows again what is published again); `withdrawn --dry-run` only
// reports. The watcher runs the same check once a night.
// ~1 request per second: the whole listing of each language, then one per missing article.
import { openStores } from "../lib/stores";
import { createPresidenceProvider } from "../sources/presidence/presidence-provider";
import { reconcileWithdrawals } from "../withdrawn";

const apply = !process.argv.includes("--dry-run");
const { stores, close } = await openStores();

try {
  const report = await reconcileWithdrawals(
    createPresidenceProvider(),
    stores.articles,
    ["fr", "wo"],
    { apply, now: () => new Date() },
  );
  const count = (check: string) =>
    String(report.missing.filter((entry) => entry.check === check).length);
  process.stdout.write(
    `${apply ? "" : "[dry run] "}Missing from the listing: ${String(report.missing.length)} · withdrawn ${count("withdrawn")} · still published ${count("still-published")} · unconfirmed ${count("unconfirmed")} · newly hidden ${String(report.hidden)} · shown again ${String(report.restored)}\n`,
  );
  for (const entry of report.missing.filter((item) => item.check !== "still-published")) {
    process.stdout.write(`  ${entry.check} [${entry.lang}] ${entry.sourceUrl}\n`);
  }
} finally {
  await close();
}
