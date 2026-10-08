import { articleContentHash, type ArticleRepository } from "@bgs/content-store";
import type {
  NewsArticle,
  Translation,
  TranslationDecision,
  TranslationReviewDetail,
  TranslationToReview,
} from "@bgs/shared-types";
import type { AuditJournal } from "../admin/audit-journal";
import { paragraphsOf } from "../assistant/passages";

/*
 * The review of machine translations into Wolof (AI-13). Validated, a translation
 * is shown without the « traduction automatique » label; set aside, it is removed
 * and the article is shown in French only. Each decision is a new version of the
 * article (nothing overwritten silently) and goes to the audit journal.
 */

const PAGE_SIZE = 200;

export class TranslationReviewError extends Error {
  constructor(readonly code: "TRANSLATION_NOT_FOUND" | "TRANSLATION_NOT_PENDING") {
    super(code);
  }
}

function live(article: NewsArticle, lang: "fr" | "wo"): Translation | undefined {
  return article.translations.find((t) => t.lang === lang && t.withdrawnAt === undefined);
}

/** The French and the machine Wolof of an article still to review, if any. */
function pendingPair(article: NewsArticle): { french: Translation; wolof: Translation } | null {
  const french = live(article, "fr");
  const wolof = live(article, "wo");
  return french !== undefined && wolof?.status === "machine" ? { french, wolof } : null;
}

export class TranslationReview {
  constructor(
    private readonly articles: ArticleRepository,
    private readonly journal: AuditJournal,
  ) {}

  /** Newest first (the article list's own order). */
  async pending(): Promise<TranslationToReview[]> {
    const found: TranslationToReview[] = [];
    let cursor: string | undefined;
    do {
      const page = await this.articles.list({ limit: PAGE_SIZE, cursor });
      for (const article of page.items) {
        const pair = pendingPair(article);
        if (pair !== null) {
          found.push({
            articleId: article.id,
            publishedOn: article.sourcePublishedOn,
            frenchTitle: pair.french.title,
            wolofTitle: pair.wolof.title,
          });
        }
      }
      cursor = page.nextCursor ?? undefined;
    } while (cursor !== undefined);
    return found;
  }

  private async pendingArticle(id: string) {
    const article = await this.articles.get(id);
    const pair = article === null ? null : pendingPair(article);
    if (article === null || pair === null) {
      throw new TranslationReviewError(
        article === null ? "TRANSLATION_NOT_FOUND" : "TRANSLATION_NOT_PENDING",
      );
    }
    return { article, ...pair };
  }

  async detail(id: string): Promise<TranslationReviewDetail> {
    const { article, french, wolof } = await this.pendingArticle(id);
    return {
      articleId: article.id,
      publishedOn: article.sourcePublishedOn,
      sourceUrl: french.sourceUrl ?? article.sourceUrl,
      french: { title: french.title, paragraphs: paragraphsOf(french.bodyHtml) },
      wolof: { title: wolof.title, paragraphs: paragraphsOf(wolof.bodyHtml) },
    };
  }

  async decide(id: string, { decision }: TranslationDecision, reviewerId: string): Promise<void> {
    const { article, wolof } = await this.pendingArticle(id);
    const at = new Date().toISOString();
    const others = article.translations.filter((t) => t !== wolof);
    const translations =
      decision === "validate"
        ? [
            ...others,
            { ...wolof, status: "reviewed" as const, review: { reviewerId, reviewedAt: at } },
          ]
        : others;
    await this.articles.save({
      ...article,
      translations,
      contentHash: articleContentHash(translations, article.sourcePublishedOn, article.category),
    });
    await this.journal.append({
      at,
      actor: reviewerId,
      action: decision === "validate" ? "translation.validated" : "translation.set-aside",
      target: article.id,
      details: { lang: "wo" },
    });
  }
}
