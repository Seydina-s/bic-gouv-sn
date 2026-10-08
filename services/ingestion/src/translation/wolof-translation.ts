import { type ArticleRepository, type JsonDocument, TypedDocument } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { articleContentHash } from "../merge";
import type { BatchRequest, BatchResult, BatchStatus } from "./claude-batches";
import { checkTranslation, type TranslationRefusal } from "./translation-check";
import { articlesToTranslate, examplePairs, frenchToTranslate } from "./wolof-candidates";
import { translationRequest, translationSystem } from "./wolof-prompt";

/*
 * Wolof for the articles the Présidence did not publish in Wolof (AI-13): sent in
 * batches, collected later (within a day), each translation checked, then saved as
 * a machine translation, labelled as such in the app until a person reviews it. An
 * official Wolof version collected later replaces it (merge.ts).
 */

const PAGE_SIZE = 200;

/** Room for the Wolof (a little longer than French), never cut short. */
export function outputTokensFor(frenchCharacters: number): number {
  return Math.min(32_000, Math.max(1024, Math.ceil(frenchCharacters * 0.6) + 500));
}

const runSchema = z.object({
  batchId: z.string().min(1),
  model: z.string().min(1),
  submittedAt: z.string(),
  /** Each article sent, and the version it was sent at. */
  articles: z.array(z.object({ id: z.string(), contentHash: z.string() })),
  collectedAt: z.string().nullable(),
});
const stateSchema = z.object({ runs: z.array(runSchema) });
type Run = z.infer<typeof runSchema>;

/** What a collection did with each reply. */
export interface CollectReport {
  saved: number;
  refused: Partial<Record<TranslationRefusal, number>>;
  failed: number;
  /** The article changed or got an official Wolof version since it was sent. */
  outdated: number;
  inputTokens: number;
  outputTokens: number;
  stillRunning: number;
}

export interface BatchClient {
  create(requests: readonly BatchRequest[]): Promise<string>;
  status(id: string): Promise<{ status: BatchStatus; resultsUrl: string | null }>;
  results(resultsUrl: string): Promise<BatchResult[]>;
}

export interface WolofTranslationOptions {
  articles: ArticleRepository;
  /** Where the runs are remembered between the sending and the collection. */
  state: JsonDocument;
  now?: () => Date;
}

export async function allArticles(articles: ArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

export class WolofTranslation {
  private readonly state: TypedDocument<z.infer<typeof stateSchema>>;
  private readonly now: () => Date;

  constructor(private readonly options: WolofTranslationOptions) {
    this.state = new TypedDocument(options.state, stateSchema, { runs: [] });
    this.now = options.now ?? (() => new Date());
  }

  /** The articles still waiting for Wolof, not already sent in a run being processed. */
  async pending(since: string | null): Promise<{ all: NewsArticle[]; toSend: NewsArticle[] }> {
    const all = await allArticles(this.options.articles);
    const sent = new Set(
      (await this.state.read()).runs
        .filter((run) => run.collectedAt === null)
        .flatMap((run) => run.articles.map((article) => article.id)),
    );
    return { all, toSend: articlesToTranslate(all, since).filter((a) => !sent.has(a.id)) };
  }

  /** Sends up to `limit` articles in one batch; returns how many were sent. */
  async submit(
    client: BatchClient,
    model: string,
    options: { since: string | null; limit: number },
  ) {
    const { all, toSend } = await this.pending(options.since);
    const chosen = toSend.slice(0, options.limit);
    if (chosen.length === 0) {
      return { sent: 0, batchId: null };
    }
    const system = translationSystem(examplePairs(all));
    const requests = chosen.flatMap((article): BatchRequest[] => {
      const french = frenchToTranslate(article);
      return french === null
        ? []
        : [
            {
              customId: article.id,
              system,
              user: translationRequest(french),
              maxOutputTokens: outputTokensFor(french.bodyHtml.length),
            },
          ];
    });
    const batchId = await client.create(requests);
    await this.state.change((current) => ({
      next: {
        runs: [
          ...current.runs,
          {
            batchId,
            model,
            submittedAt: this.now().toISOString(),
            articles: chosen.map(({ id, contentHash }) => ({ id, contentHash })),
            collectedAt: null,
          },
        ],
      },
      result: undefined,
    }));
    return { sent: requests.length, batchId };
  }

  /** Saves what the ended runs translated; runs still being processed are left for later. */
  async collect(client: BatchClient): Promise<CollectReport> {
    const report: CollectReport = {
      saved: 0,
      refused: {},
      failed: 0,
      outdated: 0,
      inputTokens: 0,
      outputTokens: 0,
      stillRunning: 0,
    };
    const open = (await this.state.read()).runs.filter((run) => run.collectedAt === null);
    for (const run of open) {
      const { status, resultsUrl } = await client.status(run.batchId);
      if (status !== "ended" || resultsUrl === null) {
        report.stillRunning += 1;
        continue;
      }
      for (const result of await client.results(resultsUrl)) {
        await this.apply(run, result, report);
      }
      await this.markCollected(run.batchId);
    }
    return report;
  }

  private async apply(run: Run, result: BatchResult, report: CollectReport): Promise<void> {
    if (!result.ok) {
      report.failed += 1;
      return;
    }
    report.inputTokens += result.inputTokens;
    report.outputTokens += result.outputTokens;
    const sent = run.articles.find((article) => article.id === result.customId);
    const article = await this.options.articles.get(result.customId);
    const french = article === null ? null : frenchToTranslate(article);
    if (
      sent === undefined ||
      article === null ||
      french === null ||
      article.contentHash !== sent.contentHash
    ) {
      report.outdated += 1;
      return;
    }
    const checked = checkTranslation(french, result.text);
    if (!checked.ok) {
      report.refused[checked.refusal] = (report.refused[checked.refusal] ?? 0) + 1;
      return;
    }
    const translations = [
      ...article.translations,
      {
        lang: "wo" as const,
        status: "machine" as const,
        title: checked.title,
        bodyHtml: checked.bodyHtml,
      },
    ];
    await this.options.articles.save({
      ...article,
      translations,
      contentHash: articleContentHash(translations, article.sourcePublishedOn, article.category),
    });
    report.saved += 1;
  }

  private markCollected(batchId: string): Promise<void> {
    const at = this.now().toISOString();
    return this.state.change((current) => ({
      next: {
        runs: current.runs.map((run) =>
          run.batchId === batchId ? { ...run, collectedAt: at } : run,
        ),
      },
      result: undefined,
    }));
  }
}
