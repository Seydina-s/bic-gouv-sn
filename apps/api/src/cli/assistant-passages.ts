// Measures the official base cut into passages for the assistant, and what the
// lexical search finds for questions given on the command line:
// `pnpm --filter @bgs/api assistant:passages "question 1" "question 2"`.
// Read-only. Messages are in French: this command is run by the team.
import { join } from "node:path";
import { FileArticleRepository, FileProcedureRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { PassageIndex } from "../assistant/passage-search";
import { articlePassages, procedurePassages, type Passage } from "../assistant/passages";
import { retrievePassages } from "../assistant/retrieval";
import { SemanticLayer } from "../assistant/semantic-layer";
import { TransformersEmbedder } from "../assistant/transformers-embedder";
import { loadConfig } from "../config";

const PAGE_SIZE = 200;
const today = new Date().toISOString().slice(0, 10);

async function allArticles(store: FileArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await store.list({ limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

function describe(label: string, passages: Passage[]): string {
  const characters = passages.reduce((sum, passage) => sum + passage.text.length, 0);
  const average = Math.round(characters / Math.max(passages.length, 1));
  return `${label} : ${String(passages.length)} passages, ${String(characters)} caractères, ${String(average)} en moyenne`;
}

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const articles = await allArticles(new FileArticleRepository(config.NEWS_STORE_PATH));
  const procedures = await new FileProcedureRepository(config.PROCEDURES_STORE_PATH).all();
  const fromArticles = articles.flatMap(articlePassages);
  const fromProcedures = procedures.flatMap(procedurePassages);
  const passages = [...fromArticles, ...fromProcedures];

  process.stdout.write(`${describe("Articles", fromArticles)}\n`);
  process.stdout.write(`${describe("Démarches", fromProcedures)}\n`);
  for (const lang of ["fr", "wo"] as const) {
    process.stdout.write(
      `${describe(
        `En ${lang}`,
        passages.filter((p) => p.lang === lang),
      )}\n`,
    );
  }

  const started = performance.now();
  const index = new PassageIndex(passages);
  process.stdout.write(
    `Index construit en ${String(Math.round(performance.now() - started))} ms\n`,
  );

  // --meaning: the search by meaning too (computes the vectors the API then reuses).
  const meaning = process.argv.includes("--meaning")
    ? new SemanticLayer({
        embedder: new TransformersEmbedder(join(config.ASSISTANT_VECTORS_ROOT, "models")),
        path: join(config.ASSISTANT_VECTORS_ROOT, "vectors.json"),
      })
    : null;
  if (meaning !== null) {
    const began = performance.now();
    await meaning.update(passages);
    process.stdout.write(
      `Vecteurs prêts en ${String(Math.round((performance.now() - began) / 1000))} s
`,
    );
  }

  for (const question of process.argv.slice(2).filter((arg) => !arg.startsWith("--"))) {
    const vectors = meaning?.current() ?? null;
    const [vector] =
      meaning === null || vectors === null
        ? []
        : await meaning.embedder.embed([question], "query", new AbortController().signal);
    const byMeaning =
      vectors === null || vector === undefined
        ? null
        : vectors.search(vector, { lang: "fr", limit: 40 });
    // What the model would read today: words, meaning, freshness, the section named.
    const found = retrievePassages(index, question, "fr", today, byMeaning);
    process.stdout.write(`\n« ${question} »\n`);
    for (const passage of found) {
      process.stdout.write(
        `  ${passage.publishedOn ?? "sans date"}  ${passage.title}\n        ${passage.sourceUrl}\n`,
      );
    }
    if (found.length === 0) {
      process.stdout.write("  (aucun passage)\n");
    }
  }
}

await main();
