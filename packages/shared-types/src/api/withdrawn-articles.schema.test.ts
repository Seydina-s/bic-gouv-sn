import { describe, expect, it } from "vitest";
import { newsArticleSchema } from "../content/news-article.schema";
import { frTranslation, newsArticle, woTranslation } from "../testing/fixtures";
import { withdrawnArticlesResponseSchema, withdrawnVersions } from "./withdrawn-articles.schema";

describe("withdrawnVersions", () => {
  it("lists only the withdrawn versions, most recently withdrawn first", () => {
    const older = newsArticleSchema.parse(
      newsArticle({
        id: "00000000-0000-5000-8000-000000000001",
        translations: [frTranslation({ withdrawnAt: "2026-09-20T02:00:00Z" }), woTranslation()],
      }),
    );
    const newer = newsArticleSchema.parse(
      newsArticle({
        id: "00000000-0000-5000-8000-000000000002",
        translations: [frTranslation(), woTranslation({ withdrawnAt: "2026-09-28T02:00:00Z" })],
      }),
    );
    const shown = newsArticleSchema.parse(newsArticle());
    const versions = withdrawnVersions([older, shown, newer]);
    expect(versions.map(({ id, lang }) => `${id.slice(-1)}:${lang}`)).toEqual(["2:wo", "1:fr"]);
    expect(withdrawnArticlesResponseSchema.safeParse({ articles: versions }).success).toBe(true);
  });
});
