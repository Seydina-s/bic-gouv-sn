// Measures the assistant's passage search on the test set of the repository
// (data/assistant-retrieval-eval.json): `pnpm --filter @bgs/api assistant:eval`.
// Read-only. Messages are in French: this command is run by the team.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FileArticleRepository, FileProcedureRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { PassageIndex } from "../assistant/passage-search";
import { articlePassages, procedurePassages } from "../assistant/passages";
import {
  byWordsOnly,
  RANKS,
  rankOf,
  retrievalSetSchema,
  summarize,
  unknownPages,
  type CaseResult,
  type Search,
} from "../assistant/retrieval-eval";
import { retrievePassages } from "../assistant/retrieval";
import { SemanticLayer } from "../assistant/semantic-layer";
import { TransformersEmbedder } from "../assistant/transformers-embedder";
import { loadConfig } from "../config";

const PAGE_SIZE = 200;

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

const percent = (share: number) => `${String(Math.round(share * 100))} %`;

function report(label: string, results: CaseResult[]): string {
  const summary = summarize(results);
  const within = RANKS.map(
    (rank) =>
      `${rank === 1 ? "en tête" : `dans les ${String(rank)} premières`} ${percent(summary.within[rank])}`,
  );
  return `${label} (${String(summary.cases)} questions) : ${within.join(" · ")} · score ${summary.meanReciprocalRank.toFixed(2)}`;
}

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const raw: unknown = JSON.parse(
    await readFile(new URL("../../data/assistant-retrieval-eval.json", import.meta.url), "utf8"),
  );
  const { cases } = retrievalSetSchema.parse(raw);
  const articles = await allArticles(new FileArticleRepository(config.NEWS_STORE_PATH));
  const procedures = await new FileProcedureRepository(config.PROCEDURES_STORE_PATH).all();
  const passages = [...articles.flatMap(articlePassages), ...procedures.flatMap(procedurePassages)];

  const missing = unknownPages(cases, new Set(passages.map((passage) => passage.sourceUrl)));
  for (const url of missing) {
    process.stdout.write(`Page attendue absente de la base : ${url}\n`);
  }

  const index = new PassageIndex(passages);
  const today = new Date().toISOString().slice(0, 10);
  const searches: [string, Search][] = [
    ["Mots seuls", byWordsOnly(index)],
    [
      "Mots, date et rubrique",
      (question, depth) => retrievePassages(index, question, "fr", today, null, { limit: depth }),
    ],
  ];
  // --meaning: the search by meaning too, fused with several weights.
  if (process.argv.includes("--meaning")) {
    const semantic = new SemanticLayer({
      embedder: new TransformersEmbedder(join(config.ASSISTANT_VECTORS_ROOT, "models")),
      path: join(config.ASSISTANT_VECTORS_ROOT, "vectors.json"),
    });
    await semantic.update(passages);
    const vectors = semantic.current();
    const questions = await semantic.embedder.embed(
      cases.map((testCase) => testCase.question),
      "query",
      new AbortController().signal,
    );
    const meaningOf = new Map(
      cases.map((testCase, position) => {
        const vector = questions[position];
        return [
          testCase.question,
          vectors === null || vector === undefined
            ? []
            : vectors.search(vector, { lang: "fr", limit: 60 }),
        ];
      }),
    );
    searches.push([
      "Sens seul",
      (question, depth) => (meaningOf.get(question) ?? []).slice(0, depth).map((f) => f.passage),
    ]);
    for (const weight of [1, 2, 3]) {
      searches.push([
        `Mots + sens (poids ${String(weight)}), date et rubrique`,
        (question, depth) =>
          retrievePassages(index, question, "fr", today, meaningOf.get(question) ?? null, {
            limit: depth,
            meaningWeight: weight,
          }),
      ]);
    }
  }
  for (const [label, search] of searches) {
    const measured = cases.map((testCase) => rankOf(search, testCase));
    process.stdout.write(`${report(label, measured)}\n`);
  }
  const last = searches.at(-1)?.[1] ?? byWordsOnly(index);
  const results = cases.map((testCase) => rankOf(last, testCase));
  process.stdout.write(`\nDernière recherche mesurée :\n${report("Toutes", results)}\n`);
  for (const style of ["direct", "reformulated"] as const) {
    const label = style === "direct" ? "Mots de la source" : "Reformulées";
    process.stdout.write(
      `${report(
        label,
        results.filter((r) => r.testCase.style === style),
      )}\n`,
    );
  }
  process.stdout.write("\nHors des 3 premières pages :\n");
  for (const { testCase, rank } of results.filter((r) => r.rank === null || r.rank > 3)) {
    process.stdout.write(
      `  ${rank === null ? "absente" : `rang ${String(rank)}`} · ${testCase.question}\n`,
    );
  }
}

await main();
