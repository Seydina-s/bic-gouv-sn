// Wolof for the articles published without an official Wolof version (AI-13).
// Messages are in French: this command is run by the team.
//   pnpm --filter @bgs/ingestion translate:wolof --estimate [--since 2025-10-01]
//   pnpm --filter @bgs/ingestion translate:wolof --submit [--since 2025-10-01] [--limit 50]
//   pnpm --filter @bgs/ingestion translate:wolof --collect
// --estimate sends nothing and needs no key. --submit and --collect read
// ANTHROPIC_API_KEY from apps/api/.env.local (typed there by the owner only).
import { openStores } from "../lib/stores";
import { ClaudeBatches } from "../translation/claude-batches";
import { BATCH_PRICES, estimateCost } from "../translation/cost-estimate";
import { examplePairs } from "../translation/wolof-candidates";
import { WolofTranslation } from "../translation/wolof-translation";

const DEFAULT_MODEL = "claude-opus-5-5";

/** Why a reply cannot be read as JSON, if it cannot (for --inspect). */
function readingProblem(text: string): string | null {
  try {
    JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "illisible";
  }
}
const STATE = "translation-runs";

function option(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : (process.argv[index + 1] ?? null);
}

const since = option("--since");
const limit = Number(option("--limit") ?? "1000");
const model = process.env["TRANSLATION_MODEL"] ?? DEFAULT_MODEL;
const say = (line: string) => process.stdout.write(`${line}\n`);
const dollars = (amount: number | null) =>
  amount === null ? "prix inconnu" : `${amount.toFixed(2)} $`;

if (since !== null && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
  throw new Error("--since attend une date AAAA-MM-JJ");
}
if (!Number.isInteger(limit) || limit < 1) {
  throw new Error("--limit attend un nombre entier positif");
}

const { stores, document, close } = await openStores();
const translation = new WolofTranslation({ articles: stores.articles, state: document(STATE) });

function client(): ClaudeBatches {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (apiKey === undefined || apiKey === "") {
    throw new Error(
      "Clé absente : saisissez ANTHROPIC_API_KEY dans apps/api/.env.local (docs/guides/brancher-l-assistant.md).",
    );
  }
  return new ClaudeBatches({ apiKey, model });
}

try {
  if (process.argv.includes("--estimate")) {
    const { all, toSend } = await translation.pending(since);
    const chosen = toSend.slice(0, limit);
    const estimate = estimateCost(chosen, examplePairs(all), Object.keys(BATCH_PRICES));
    say(
      `Articles à traduire : ${String(estimate.articles)} (${String(estimate.frenchCharacters)} caractères)`,
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
        : `${String(sent)} articles envoyés (lot ${batchId ?? ""}). Relancez --collect dans quelques heures.`,
    );
  } else if (process.argv.includes("--inspect")) {
    // The first reply of the latest run as the model wrote it (public content only).
    const replies = await translation.latestReplies(client());
    const first = replies.find((reply) => reply.ok);
    if (first?.ok !== true) {
      say("Aucune réponse à montrer.");
    } else {
      say(`Jetons écrits : ${String(first.outputTokens)}`);
      say(`Début :
${first.text.slice(0, 300)}`);
      say(`Fin :
${first.text.slice(-300)}`);
      say(`Lecture : ${readingProblem(first.text) ?? "lisible"}`);
    }
  } else if (process.argv.includes("--collect") || process.argv.includes("--recollect")) {
    const report = process.argv.includes("--recollect")
      ? await translation.recollectLatest(client())
      : await translation.collect(client());
    const price = BATCH_PRICES[model];
    const cost =
      price === undefined
        ? null
        : (report.inputTokens * price.input + report.outputTokens * price.output) / 1_000_000;
    say(`Traductions enregistrées : ${String(report.saved)}`);
    say(`Écartées par les contrôles : ${JSON.stringify(report.refused)}`);
    say(
      `Échecs du service : ${String(report.failed)} · articles changés entre-temps : ${String(report.outdated)}`,
    );
    say(
      `Lots encore en cours : ${String(report.stillRunning)} · coût de cette collecte : ${dollars(cost)}`,
    );
  } else {
    say("Précisez --estimate, --submit, --collect, --inspect ou --recollect.");
  }
} finally {
  await close();
}
