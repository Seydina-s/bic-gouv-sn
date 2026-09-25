import { describe, expect, it } from "vitest";
import { audioTrack, frTranslation, newsArticle, woTranslation } from "../testing/fixtures";
import { newsArticleSchema } from "./news-article.schema";

function issueMessages(input: unknown): string[] {
  return newsArticleSchema.safeParse(input).error?.issues.map((issue) => issue.message) ?? [];
}

describe("newsArticleSchema", () => {
  it("accepts a bilingual article with official FR and WO versions", () => {
    expect(newsArticleSchema.safeParse(newsArticle()).success).toBe(true);
  });

  it("accepts an article without a publication date instead of guessing one", () => {
    expect(
      newsArticleSchema.safeParse(newsArticle({ sourcePublishedOn: null, sourceUpdatedAt: null }))
        .success,
    ).toBe(true);
  });

  it("accepts a machine-translated Wolof version when the official one is missing", () => {
    const translations = [
      frTranslation(),
      woTranslation({ status: "machine", sourceUrl: undefined }),
    ];
    expect(newsArticleSchema.safeParse(newsArticle({ translations })).success).toBe(true);
  });

  it("rejects a publication date carrying an invented time", () => {
    const article = newsArticle({ sourcePublishedOn: "2026-09-24T00:00:00Z" });
    expect(newsArticleSchema.safeParse(article).success).toBe(false);
  });

  it("rejects content from a non-official source", () => {
    const article = newsArticle({ sourceUrl: "https://example.com/news" });
    expect(newsArticleSchema.safeParse(article).success).toBe(false);
  });

  it("rejects two translations in the same language", () => {
    const translations = [frTranslation(), frTranslation()];
    expect(issueMessages(newsArticle({ translations }))).toContain(
      "Only one translation per language is allowed",
    );
  });

  it("requires the original language as an official translation", () => {
    const translations = [woTranslation()];
    expect(issueMessages(newsArticle({ translations }))).toContain(
      "The original language must be present as an official translation",
    );
  });

  it("rejects audio for a language without translation", () => {
    const article = newsArticle({
      translations: [frTranslation()],
      audio: [audioTrack({ lang: "wo" })],
    });
    expect(issueMessages(article)).toContain(
      "Audio is only allowed for languages that have a translation",
    );
  });

  it("rejects invalid versions, hashes and unknown fields", () => {
    expect(newsArticleSchema.safeParse(newsArticle({ version: 0 })).success).toBe(false);
    expect(newsArticleSchema.safeParse(newsArticle({ contentHash: "abc" })).success).toBe(false);
    expect(newsArticleSchema.safeParse(newsArticle({ comments: [] })).success).toBe(false);
  });
});
