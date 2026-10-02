// Measures the assistant's passage search on the test set of the repository
// (data/assistant-retrieval-eval.json): `pnpm --filter @bgs/api assistant:eval`.
// Read-only. Messages are in French: this command is run by the team.
import { readFile } from "node:fs/promises";
import { FileArticleRepository, FileProcedureRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { PassageIndex } from "../assistant/passage-search";
import { articlePassages, procedurePassages } from "../assistant/passages";
import {
  RANKS,
  rankOf,
  retrievalSetSchema,
  summarize,
  unknownPages,
  type CaseResult,
} from "../assistant/retrieval-eval";
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
  const results = cases.map((testCase) => rankOf(index, testCase));
  process.stdout.write(`${report("Toutes", results)}\n`);
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
