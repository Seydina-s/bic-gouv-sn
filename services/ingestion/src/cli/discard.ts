// Stored articles the publishing rules now refuse (DATA-10). Messages are in French:
// this command is run by the team.
//   pnpm --filter @bgs/ingestion discard                    lists them, changes nothing
//   pnpm --filter @bgs/ingestion discard --apply <id> [<id>…]   deletes those, on the
//     owner's decision only; each is kept whole first in the private document
//     "discarded-articles" (never served), from which it can be put back.
import { discardArticles, refusedArticles } from "../discard";
import { openStores } from "../lib/stores";

const apply = process.argv.includes("--apply");
const ids = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
const { stores, document, close } = await openStores();

try {
  if (!apply) {
    const refused = await refusedArticles(stores.articles);
    process.stdout.write(`Articles refusés par les règles actuelles : ${String(refused.length)}\n`);
    for (const item of refused) {
      process.stdout.write(
        `${item.id} · ${item.publisher} · ${item.publishedOn ?? "sans date"} · ${item.title} · ${item.reason} · ${item.sourceUrl}\n`,
      );
    }
  } else if (ids.length === 0) {
    process.stdout.write("Indiquer les identifiants des articles à supprimer après --apply.\n");
    process.exitCode = 1;
  } else {
    const outcome = await discardArticles(
      stores.articles,
      document("discarded-articles"),
      ids,
      () => new Date(),
    );
    process.stdout.write(
      `Supprimés : ${String(outcome.deleted.length)} · laissés en place (acceptés par les règles ou inconnus) : ${outcome.kept.join(", ") || "aucun"}\n`,
    );
  }
} finally {
  await close();
}
