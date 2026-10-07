import type { ArticleRepository, ProcedureRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { PassageIndex } from "./passage-search";
import { articlePassages, procedurePassages } from "./passages";

/*
 * The official base as the assistant searches it: every article and procedure cut
 * into passages, rebuilt now and then so new articles are found. An instance nobody
 * asks anything rebuilds nothing; a question asked while a rebuild runs is answered
 * from the previous base.
 */

const PAGE_SIZE = 200;
/** New articles reach the assistant within this delay. */
export const KNOWLEDGE_REFRESH_MS = 5 * 60_000;

export interface Knowledge {
  index: PassageIndex;
  /** Slug of each procedure by id, for the app to open its sheet. */
  procedureSlugs: ReadonlyMap<string, string>;
}

export interface KnowledgeSource {
  read(): Promise<Knowledge>;
}

async function allArticles(articles: ArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

export async function buildKnowledge(
  articles: ArticleRepository,
  procedures: ProcedureRepository,
): Promise<Knowledge> {
  const [allNews, allProcedures] = await Promise.all([allArticles(articles), procedures.all()]);
  return {
    index: new PassageIndex([
      ...allNews.flatMap(articlePassages),
      ...allProcedures.flatMap(procedurePassages),
    ]),
    procedureSlugs: new Map(allProcedures.map((procedure) => [procedure.id, procedure.slug])),
  };
}

export interface RefreshedKnowledgeOptions {
  build: () => Promise<Knowledge>;
  refreshEveryMs?: number;
  now?: () => number;
  /** A failed rebuild keeps the previous base; told here. */
  onRefreshError?: (error: unknown) => void;
}

export class RefreshedKnowledge implements KnowledgeSource {
  private latest: { knowledge: Knowledge; builtAt: number } | null = null;
  private building: Promise<Knowledge> | null = null;
  private readonly now: () => number;

  constructor(private readonly options: RefreshedKnowledgeOptions) {
    this.now = options.now ?? Date.now;
  }

  read(): Promise<Knowledge> {
    const { latest } = this;
    if (latest === null) {
      return this.rebuild();
    }
    if (this.now() - latest.builtAt >= (this.options.refreshEveryMs ?? KNOWLEDGE_REFRESH_MS)) {
      this.rebuild().catch((error: unknown) => this.options.onRefreshError?.(error));
    }
    return Promise.resolve(latest.knowledge);
  }

  /** One rebuild at a time, whoever asks. */
  private rebuild(): Promise<Knowledge> {
    this.building ??= this.options
      .build()
      .then((knowledge) => {
        this.latest = { knowledge, builtAt: this.now() };
        return knowledge;
      })
      .finally(() => {
        this.building = null;
      });
    return this.building;
  }
}
