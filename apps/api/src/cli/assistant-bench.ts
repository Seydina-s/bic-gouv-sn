// The assistant's weekly test bench (AST-30d): about a hundred questions asked to the
// real assistant, checked, kept with the known weaknesses next to the data.
//   pnpm --filter @bgs/api assistant:bench --dry   lists the questions, pays nothing
//   pnpm --filter @bgs/api assistant:bench --weaknesses   the known weaknesses and the
//     traps only, a few cents: to check a fix at once, and that it opens no door
//   pnpm --filter @bgs/api assistant:bench         asks them (≈ 1 $ with Sonnet 5.5)
// Reads ANTHROPIC_API_KEY from .env.local (typed there by the owner only). Messages
// are in French: this command is run by the team.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { contentStores, fileDocument, StateServiceStore } from "@bgs/content-store";
import { openDatabase } from "@bgs/database";
import { answerSetSchema } from "../assistant/answer-eval";
import {
  generatedCases,
  judgeBench,
  retrievalCases,
  summarizeBench,
  trapCases,
  updateWeaknesses,
  weaknessCases,
  weaknessSchema,
  withEvidence,
  type BenchCase,
  type BenchVerdict,
} from "../assistant/bench";
import { benchFolder, WEAKNESSES_FILE } from "../assistant/bench-results";
import { ClaudeProvider } from "../assistant/claude-provider";
import {
  answerQuestion,
  type AnswerTrace,
  type GroundedAnswer,
} from "../assistant/grounded-answer";
import { buildKnowledge } from "../assistant/knowledge";
import { SemanticLayer } from "../assistant/semantic-layer";
import { TransformersEmbedder } from "../assistant/transformers-embedder";
import { retrievalSetSchema } from "../assistant/retrieval-eval";
import { loadConfig } from "../config";
import { z } from "zod";

/** A question waits this long at most for the model. */
const QUESTION_TIMEOUT_MS = 30_000;
/** Questions asked at once: quick, without crowding the model. */
const AT_ONCE = 3;

const say = (line: string) => process.stdout.write(`${line}\n`);
const percent = (passed: number, cases: number) =>
  `${String(Math.round((passed / Math.max(cases, 1)) * 100))} %`;

const KIND_LABELS: Record<BenchCase["kind"], string> = {
  "news-period": "Actualités d'une période",
  council: "Dernier Conseil des ministres",
  procedure: "Démarches",
  service: "Services de l'État",
  "search-direct": "Questions avec les mots de la source",
  "search-rephrased": "Questions reformulées",
  "search-citizen": "Questions écrites comme on parle",
  trap: "Pièges (refus attendu)",
};

const config = loadConfig(process.env);
const today = new Date().toISOString().slice(0, 10);
const dry = process.argv.includes("--dry");
const weaknessesOnly = process.argv.includes("--weaknesses");
const root = benchFolder(config.NEWS_STORE_PATH);
const weaknessesPath = join(root, WEAKNESSES_FILE);

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function fixedSets() {
  const data = new URL("../../data/", import.meta.url);
  const retrieval = retrievalSetSchema.parse(
    await readJson(fileURLToPath(new URL("assistant-retrieval-eval.json", data))),
  );
  const traps = answerSetSchema.parse(
    await readJson(fileURLToPath(new URL("assistant-answer-eval.json", data))),
  );
  return { retrieval: retrieval.cases, traps: traps.cases };
}

async function readWeaknesses() {
  try {
    return z.array(weaknessSchema).parse(await readJson(weaknessesPath));
  } catch {
    return [];
  }
}

/** Runs `work` over `items`, a few at a time, in order. */
async function inGroups<T, R>(items: readonly T[], work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += AT_ONCE) {
    results.push(...(await Promise.all(items.slice(start, start + AT_ONCE).map(work))));
  }
  return results;
}

const database = await openDatabase(config.DATABASE_URL);
try {
  const { articles, procedures } = contentStores(database, {
    news: config.NEWS_STORE_PATH,
    procedures: config.PROCEDURES_STORE_PATH,
    procedureThemes: config.PROCEDURE_THEMES_PATH,
    stateServices: config.STATE_SERVICES_PATH,
    remoteConfig: config.REMOTE_CONFIG_PATH,
    ingestionStatus: config.INGESTION_STATUS_PATH,
  });
  const services = new StateServiceStore(fileDocument(config.STATE_SERVICES_PATH));
  const knowledge = await buildKnowledge(articles, procedures, services);
  const { retrieval, traps } = await fixedSets();
  const previous = await readWeaknesses();
  const dateOf = new Map(knowledge.passages.map((p) => [p.sourceUrl, p.publishedOn]));
  const dated = (url: string) => dateOf.get(url) ?? null;
  const nextWeek = new Date(Date.parse(today) + 7 * 86_400_000).toISOString().slice(0, 10);
  // Every case the bench knows today, both halves of the retrieval set included.
  const current = [
    ...generatedCases(knowledge.passages, today),
    ...retrievalCases(retrieval, today, dated),
    ...retrievalCases(retrieval, nextWeek, dated),
    ...trapCases(traps),
  ];
  const asked = weaknessesOnly
    ? trapCases(traps)
    : [
        ...generatedCases(knowledge.passages, today),
        ...retrievalCases(retrieval, today, dated),
        ...trapCases(traps),
      ];
  const cases = [...asked, ...weaknessCases(previous, asked, current)];
  say(
    `Banc d'essai du ${today} : ${String(cases.length)} questions, dont ${String(cases.length - asked.length)} faiblesses connues`,
  );
  if (dry) {
    for (const c of cases) {
      say(`  [${KIND_LABELS[c.kind]}] ${c.question}`);
    }
  } else {
    if (config.ANTHROPIC_API_KEY === undefined) {
      throw new Error("Clé absente : saisissez ANTHROPIC_API_KEY dans apps/api/.env.local.");
    }
    const llm = new ClaudeProvider({
      apiKey: config.ANTHROPIC_API_KEY,
      model: config.ASSISTANT_MODEL,
    });
    const wolofLlm = new ClaudeProvider({
      apiKey: config.ANTHROPIC_API_KEY,
      model: config.ASSISTANT_WOLOF_MODEL,
    });
    // The search by meaning as the API uses it, when it is switched on.
    const semantic =
      config.ASSISTANT_SEMANTIC_SEARCH === "on"
        ? new SemanticLayer({
            embedder: new TransformersEmbedder(join(config.ASSISTANT_VECTORS_ROOT, "models")),
            path: join(config.ASSISTANT_VECTORS_ROOT, "vectors.json"),
          })
        : null;
    await semantic?.update(knowledge.passages);
    const vectors = semantic?.current() ?? null;
    const meaning =
      semantic === null || vectors === null ? null : { vectors, embedder: semantic.embedder };
    let costMicrodollars = 0;
    const verdicts: BenchVerdict[] = await inGroups(cases, async (c) => {
      let answer: GroundedAnswer | null;
      const traces: AnswerTrace[] = [];
      try {
        answer = await answerQuestion(
          { question: c.question, lang: c.lang, mode: "ask", today },
          {
            index: knowledge.index,
            meaning,
            llm: c.lang === "wo" ? wolofLlm : llm,
            call: (operation) => operation(AbortSignal.timeout(QUESTION_TIMEOUT_MS)),
            observe: (trace) => traces.push(trace),
          },
        );
        costMicrodollars += answer.usage?.costMicrodollars ?? 0;
      } catch {
        answer = null;
      }
      return withEvidence(judgeBench(c, answer), traces[0] ?? null);
    });
    const summary = summarizeBench(verdicts);
    const { weaknesses, fixed } = updateWeaknesses(previous, cases, verdicts, today);
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, `${today}.json`),
      JSON.stringify(
        {
          today,
          model: config.ASSISTANT_MODEL,
          summary,
          costMicrodollars,
          fixed: fixed.length,
          verdicts,
        },
        null,
        1,
      ),
    );
    await writeFile(weaknessesPath, JSON.stringify(weaknesses, null, 1));
    say(
      `Réussies : ${String(summary.passed)} sur ${String(summary.cases)} (${percent(summary.passed, summary.cases)}) · réponses inventées : ${String(summary.invented)} (objectif : 0)`,
    );
    for (const [kind, { cases: n, passed }] of Object.entries(summary.byKind)) {
      say(
        `  ${KIND_LABELS[kind as BenchCase["kind"]]} : ${String(passed)} sur ${String(n)} (${percent(passed, n)})`,
      );
    }
    say(
      `Faiblesses connues : ${String(weaknesses.length)} (${String(fixed.length)} corrigées depuis la dernière fois)`,
    );
    for (const verdict of verdicts.filter((v) => !v.passed)) {
      say(`  ✗ ${verdict.question} — ${verdict.reason ?? ""}`);
    }
    say(
      `Coût : ${(costMicrodollars / 1_000_000).toFixed(2)} $ · résultats dans ${root} (extraits donnés et réponse brute de chaque échec)`,
    );
  }
} finally {
  await database?.close();
}
