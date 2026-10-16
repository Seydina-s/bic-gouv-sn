// Articles the source withdrew (ING-03, ING-04): `pnpm --filter @bgs/ingestion withdrawn
// [--source <institution>]` hides them (and shows again what is published again);
// `--dry-run` only reports. The watcher runs the same check once a night per institution.
// presidence.sn: its whole listing; any other site: its newest pages (RECENT_PAGES).
import { openStores } from "../lib/stores";
import { NEWS_SOURCES, sourceOption } from "../sources/news-sources";
import { listingPagesFor, reconcileWithdrawals } from "../withdrawn";

const apply = !process.argv.includes("--dry-run");
const institution = sourceOption(process.argv);
const { stores, close } = await openStores();

try {
  const report = await reconcileWithdrawals(
    NEWS_SOURCES[institution](),
    stores.articles,
    institution === "presidence" ? ["fr", "wo"] : ["fr"],
    {
      apply,
      now: () => new Date(),
      institution,
      listingPages: listingPagesFor(institution),
    },
  );
  const count = (check: string) =>
    String(report.missing.filter((entry) => entry.check === check).length);
  process.stdout.write(
    `${apply ? "" : "[dry run] "}${institution} · missing from the listing: ${String(report.missing.length)} · withdrawn ${count("withdrawn")} · still published ${count("still-published")} · unconfirmed ${count("unconfirmed")} · newly hidden ${String(report.hidden)} · shown again ${String(report.restored)}\n`,
  );
  if (report.suspicious) {
    process.stdout.write("Too many withdrawals at once: nothing hidden, check the site.\n");
  }
  for (const entry of report.missing.filter((item) => item.check !== "still-published")) {
    process.stdout.write(`  ${entry.check} [${entry.lang}] ${entry.sourceUrl}\n`);
  }
} finally {
  await close();
}
