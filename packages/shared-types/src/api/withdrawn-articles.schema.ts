import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import { isoDateTimeSchema, langSchema, slugSchema } from "../common/primitives.schema";
import type { NewsArticle } from "../content/news-article.schema";

/**
 * Article versions the source withdrew, hidden from the app but kept in our store:
 * the console lists them for traceability (decision of 28/09/2026).
 */
export const withdrawnArticleSchema = z.object({
  id: z.uuid(),
  lang: langSchema,
  title: z.string().min(1),
  category: slugSchema,
  /** Where it was published: the page that now answers "not found". */
  sourceUrl: officialSourceUrlSchema,
  withdrawnAt: isoDateTimeSchema,
});
export type WithdrawnArticle = z.infer<typeof withdrawnArticleSchema>;

export const withdrawnArticlesResponseSchema = z.object({
  articles: z.array(withdrawnArticleSchema),
});

/** The withdrawn versions of some stored articles, most recently withdrawn first. */
export function withdrawnVersions(articles: readonly NewsArticle[]): WithdrawnArticle[] {
  return articles
    .flatMap((article) =>
      article.translations.flatMap((translation) =>
        translation.withdrawnAt === undefined
          ? []
          : [
              {
                id: article.id,
                lang: translation.lang,
                title: translation.title,
                category: article.category,
                sourceUrl: translation.sourceUrl ?? article.sourceUrl,
                withdrawnAt: translation.withdrawnAt,
              },
            ],
      ),
    )
    .sort((a, b) => b.withdrawnAt.localeCompare(a.withdrawnAt));
}
