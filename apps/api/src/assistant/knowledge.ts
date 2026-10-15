import type { ArticleRepository, ProcedureRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { PassageIndex } from "./passage-search";
import { articlePassages, procedurePassages, type Passage } from "./passages";

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
  /** Every passage, for the search by meaning to encode. */
  passages: readonly Passage[];
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
  const passages = [
    ...allNews.flatMap(articlePassages),
    ...allProcedures.flatMap(procedurePassages),
  ];
  return {
    index: new PassageIndex(passages),
    passages,
    procedureSlugs: new Map(allProcedures.map((procedure) => [procedure.id, procedure.slug])),
  };
}

/**
 * A cheap mark of the published news, changing as soon as an article arrives: how
 * many there are, and the newest one with its version.
 */
export async function newsStamp(articles: ArticleRepository): Promise<string> {
  const newest = await articles.list({ limit: 1 });
  const first = newest.items[0];
  return `${String(newest.total)}:${first?.id ?? ""}:${String(first?.version ?? 0)}`;
}

export interface RefreshedKnowledgeOptions {
  build: () => Promise<Knowledge>;
  /**
   * A mark of the sources: when it changes, the base is built again before answering
   * (14/10/2026: an article arrived minutes before was missing from the answers).
   */
  stamp?: () => Promise<string>;
  refreshEveryMs?: number;
  now?: () => number;
  /** A failed rebuild keeps the previous base; told here. */
  onRefreshError?: (error: unknown) => void;
}

export class RefreshedKnowledge implements KnowledgeSource {
  private latest: { knowledge: Knowledge; builtAt: number; stamp: string | null } | null = null;
  private building: Promise<Knowledge> | null = null;
  private readonly now: () => number;

  constructor(private readonly options: RefreshedKnowledgeOptions) {
    this.now = options.now ?? Date.now;
  }

  async read(): Promise<Knowledge> {
    const stamp = (await this.options.stamp?.().catch(() => null)) ?? null;
    const { latest } = this;
    // New sources since the last build: answered from them, never from the old base.
    if (latest === null || (stamp !== null && stamp !== latest.stamp)) {
      return this.rebuild(stamp);
    }
    if (this.now() - latest.builtAt >= (this.options.refreshEveryMs ?? KNOWLEDGE_REFRESH_MS)) {
      this.rebuild(stamp).catch((error: unknown) => this.options.onRefreshError?.(error));
    }
    return latest.knowledge;
  }

  /** One rebuild at a time, whoever asks. */
  private rebuild(stamp: string | null = null): Promise<Knowledge> {
    this.building ??= this.options
      .build()
      .then((knowledge) => {
        this.latest = { knowledge, builtAt: this.now(), stamp };
        return knowledge;
      })
      .finally(() => {
        this.building = null;
      });
    return this.building;
  }
}
