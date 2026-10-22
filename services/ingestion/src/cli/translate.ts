// Machine translation of the articles, or of the procedure sheets (--procedures),
// into Wolof or English (AI-13, ML-12, ML-14). Messages are in French: this command
// is run by the team.
//   pnpm --filter @bgs/ingestion translate --lang wo|en [--procedures] --estimate [--since 2024-04-02]
//   pnpm --filter @bgs/ingestion translate --lang wo|en [--procedures] --submit [--since …] [--limit 50]
//   pnpm --filter @bgs/ingestion translate --lang wo|en [--procedures] --collect
//   pnpm --filter @bgs/ingestion translate --lang wo|en [--procedures] --trial 10
// --estimate sends nothing and needs no key. --trial sends a few items, waits for the
// replies and writes them for a person to read, next to the data, saving nothing.
// --since applies to articles only (sheets have no publication date). The others
// read ANTHROPIC_API_KEY from apps/api/.env.local (typed there by the owner only).
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { openStores } from "../lib/stores";
import { ArticleTranslation, allArticles } from "../translation/article-translation";
import { DEFAULT_TRANSLATION_MODEL } from "../translation/auto-translation";
import type { BatchTranslation } from "../translation/batch-translation";
import { ClaudeBatches } from "../translation/claude-batches";
import { BATCH_PRICES } from "../translation/cost-estimate";
import { SheetTranslation, sheetTrialPicks } from "../translation/sheet-translation";
import { TARGETS } from "../translation/targets";
import { trialPicks } from "../translation/wolof-candidates";

/** A trial waits for its batch this long at most, looking every half minute. */
const TRIAL_WAIT = { everyMs: 30_000, maxMs: 3 * 60 * 60 * 1000 } as const;

/** Why a reply cannot be read as JSON, if it cannot (for --inspect). */
function readingProblem(text: string): string | null {
  try {
    JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "illisible";
  }
}

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : (process.argv[index + 1] ?? null);
}

const langOption = option("--lang");
if (langOption !== "wo" && langOption !== "en") {
  throw new Error("--lang attend wo (wolof) ou en (anglais)");
}
const target = TARGETS[langOption];
const sheets = process.argv.includes("--procedures");
const items = sheets ? "fiches" : "articles";
const since = option("--since");
const limit = Number(option("--limit") ?? "1000");
const trialCount = option("--trial") === null ? null : Number(option("--trial"));
const model = process.env["TRANSLATION_MODEL"] ?? DEFAULT_TRANSLATION_MODEL;
const say = (line: string) => process.stdout.write(`${line}\n`);
const dollars = (amount: number | null) =>
  amount === null ? "prix inconnu" : `${amount.toFixed(2)} $`;
const costOf = (inputTokens: number, outputTokens: number) => {
  const price = BATCH_PRICES[model];
  return price === undefined
    ? null
    : (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
};

if (since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  throw new Error("--since attend une date AAAA-MM-JJ");
}
if (!Number.isInteger(limit) || limit < 1) {
  throw new Error("--limit attend un nombre entier positif");
}
if (trialCount !== null && (!Number.isInteger(trialCount) || trialCount < 1 || trialCount > 30)) {
  throw new Error("--trial attend un nombre de 1 à 30");
}

const { stores, document, paths, close } = await openStores();

function client(): ClaudeBatches {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error(
      "Clé absente : saisissez ANTHROPIC_API_KEY dans apps/api/.env.local (docs/guides/brancher-l-assistant.md).",
    );
  }
  return new ClaudeBatches({ apiKey, model });
}

/** Sends the trial, waits for its replies, writes them next to the data. */
async function trial<Item, French, Value>(
  translation: BatchTranslation<Item, French, Value>,
  chosen: readonly Item[],
): Promise<void> {
  if (chosen.length === 0) {
    // An empty batch is refused by the service (17/10/2026: 400, nothing paid).
    say(`Aucun élément à essayer : rien n'est envoyé.`);
    return;
  }
  const batches = client();
  const batchId = await translation.submitTrial(batches, chosen);
  say(
    `Essai : ${String(chosen.length)} ${items} envoyés (lot ${batchId}), en attente des réponses…`,
  );
  const started = Date.now();
  let replies = await translation.trialReplies(batches, batchId);
  while (replies === null && Date.now() - started < TRIAL_WAIT.maxMs) {
    await wait(TRIAL_WAIT.everyMs);
    replies = await translation.trialReplies(batches, batchId);
  }
  if (replies === null) {
    say(`Le lot ${batchId} n'est pas terminé après 3 heures : relancez plus tard.`);
    return;
  }
  const name = sheets
    ? `translation-trial-sheets-${target.lang}`
    : `translation-trial-${target.lang}`;
  const out = join(dirname(paths.news), `${name}.json`);
  await writeFile(out, JSON.stringify({ lang: target.lang, model, batchId, replies }, null, 1));
  const input = replies.reduce((sum, reply) => sum + reply.inputTokens, 0);
  const output = replies.reduce((sum, reply) => sum + reply.outputTokens, 0);
  say(
    `Réponses : ${String(replies.length)} · acceptées : ${String(replies.filter((reply) => reply.problem === null).length)} · coût : ${dollars(costOf(input, output))}`,
  );
  say(`Écrit dans ${out}`);
}

/** Runs the command asked on the translation runs of the articles or of the sheets. */
async function command<Item, French, Value>(
  translation: BatchTranslation<Item, French, Value>,
  trialChoice: (count: number) => Promise<Item[]>,
): Promise<void> {
  if (trialCount !== null) {
    await trial(translation, await trialChoice(trialCount));
  } else if (process.argv.includes("--estimate")) {
    const estimate = await translation.estimate({ since, limit }, Object.keys(BATCH_PRICES));
    say(
      `${sheets ? "Fiches" : "Articles"} à traduire : ${String(estimate.items)} (${String(estimate.frenchCharacters)} caractères)`,
    );
    say(
      `Estimation : ${String(estimate.inputTokens)} jetons lus, ${String(estimate.outputTokens)} jetons écrits`,
    );
    for (const [name, amount] of Object.entries(estimate.dollars)) {
      say(`  ${name} (lots, prix public) : ${dollars(amount)}`);
    }
  } else if (process.argv.includes("--submit")) {
    const { sent, batchId } = await translation.submit(client(), model, { since, limit });
    say(
      sent === 0
        ? "Rien à envoyer."
        : `${String(sent)} ${items} envoyés (lot ${batchId ?? ""}). Relancez --collect dans quelques heures.`,
    );
  } else if (process.argv.includes("--inspect")) {
    // The first reply of the latest run as the model wrote it (public content only).
    const replies = await translation.latestReplies(client());
    const first = replies.find((reply) => reply.ok);
    if (first?.ok !== true) {
      say("Aucune réponse à montrer.");
    } else {
      say(`Jetons écrits : ${String(first.outputTokens)}`);
      say(`Début :\n${first.text.slice(0, 300)}`);
      say(`Fin :\n${first.text.slice(-300)}`);
      say(`Lecture : ${readingProblem(first.text) ?? "lisible"}`);
    }
  } else if (process.argv.includes("--collect") || process.argv.includes("--recollect")) {
    const report = process.argv.includes("--recollect")
      ? await translation.recollectRecent(client())
      : await translation.collect(client());
    say(`Traductions enregistrées : ${String(report.saved)}`);
    say(
      `Jetons lus : ${String(report.inputTokens)} · jetons écrits : ${String(report.outputTokens)}`,
    );
    say(`Écartées par les contrôles : ${JSON.stringify(report.refused)}`);
    say(
      `Échecs du service : ${String(report.failed)} · ${items} changés entre-temps : ${String(report.outdated)}`,
    );
    say(
      `Lots encore en cours : ${String(report.stillRunning)} · prix des réponses lues : ${dollars(costOf(report.inputTokens, report.outputTokens))}${process.argv.includes("--recollect") ? " (déjà payé, rien de plus)" : ""}`,
    );
  } else {
    say("Précisez --trial, --estimate, --submit, --collect, --inspect ou --recollect.");
  }
}

try {
  if (sheets) {
    await command(
      new SheetTranslation({
        procedures: stores.procedures,
        target,
        articles: await allArticles(stores.articles),
        state: document(target.sheetState),
      }),
      async (count) => sheetTrialPicks(await stores.procedures.all(), count),
    );
  } else {
    await command(
      new ArticleTranslation({
        articles: stores.articles,
        target,
        state: document(target.state),
      }),
      async (count) => trialPicks(await allArticles(stores.articles), count),
    );
  }
} finally {
  await close();
}
