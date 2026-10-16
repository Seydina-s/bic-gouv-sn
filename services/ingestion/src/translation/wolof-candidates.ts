import type { NewsArticle, Translation } from "@bgs/shared-types";

/*
 * Which articles get a machine translation into Wolof, and which official pairs
 * show the model how the Présidence writes Wolof (CLAUDE.md §1: the official /wo/
 * version is always used when it exists; translation only fills what is missing).
 */

/** Official pairs given as examples: enough to show the style, few to keep the cost low. */
export const EXAMPLE_PAIRS = 3;
/** Examples long enough to show the style, short enough to stay cheap (French characters). */
const EXAMPLE_LENGTH = { min: 600, max: 2000 } as const;

function live(article: NewsArticle, lang: "fr" | "wo"): Translation | undefined {
  return article.translations.find(
    (translation) => translation.lang === lang && translation.withdrawnAt === undefined,
  );
}

/** The official French version to translate into `lang`, when the article has none in it. */
export function frenchWithout(article: NewsArticle, lang: "wo" | "en"): Translation | null {
  if (article.translations.some((translation) => translation.lang === lang)) {
    return null;
  }
  const french = live(article, "fr");
  return french?.status === "official" ? french : null;
}

/** The official French version to translate, when the article has no Wolof one at all. */
export function frenchToTranslate(article: NewsArticle): Translation | null {
  return frenchWithout(article, "wo");
}

/** Articles to translate, newest first, published on `since` or later when given. */
export function articlesToTranslate(
  articles: readonly NewsArticle[],
  since: string | null,
  pick: (article: NewsArticle) => Translation | null = frenchToTranslate,
): NewsArticle[] {
  return articles
    .filter((article) => pick(article) !== null)
    .filter((article) => since === null || (article.sourcePublishedOn ?? "") >= since)
    .sort((a, b) => (b.sourcePublishedOn ?? "").localeCompare(a.sourcePublishedOn ?? ""));
}

/** The current government's first day: the multilingual phase starts there (16/10/2026). */
export const CURRENT_GOVERNMENT_SINCE = "2024-04-02";

/**
 * Articles for a trial, the same for Wolof and English so that both can be read side
 * by side: the newest article of each institution (varied styles), without either
 * language yet, published since the current government; at most `count`.
 */
export function trialPicks(articles: readonly NewsArticle[], count: number): NewsArticle[] {
  const seen = new Set<string>();
  return articlesToTranslate(articles, CURRENT_GOVERNMENT_SINCE)
    .filter((article) => frenchWithout(article, "en") !== null)
    .filter((article) => {
      if (seen.has(article.publisher)) {
        return false;
      }
      seen.add(article.publisher);
      return true;
    })
    .slice(0, count);
}

export interface OfficialPair {
  french: Pick<Translation, "title" | "bodyHtml">;
  wolof: Pick<Translation, "title" | "bodyHtml">;
}

/** The most recent official pairs of a useful length: today's Wolof style. */
export function examplePairs(
  articles: readonly NewsArticle[],
  count = EXAMPLE_PAIRS,
): OfficialPair[] {
  return articles
    .flatMap((article) => {
      const french = live(article, "fr");
      const wolof = live(article, "wo");
      const fits =
        french?.status === "official" &&
        wolof?.status === "official" &&
        french.bodyHtml.length >= EXAMPLE_LENGTH.min &&
        french.bodyHtml.length <= EXAMPLE_LENGTH.max;
      return fits ? [{ article, french, wolof }] : [];
    })
    .sort(
      (a, b) =>
        (b.article.sourcePublishedOn ?? "").localeCompare(a.article.sourcePublishedOn ?? "") ||
        a.article.id.localeCompare(b.article.id),
    )
    .slice(0, count)
    .map(({ french, wolof }) => ({
      french: { title: french.title, bodyHtml: french.bodyHtml },
      wolof: { title: wolof.title, bodyHtml: wolof.bodyHtml },
    }));
}
