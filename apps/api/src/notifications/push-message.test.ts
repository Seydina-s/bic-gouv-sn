import type { NewsArticle } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { pushMessageFor } from "./push-message";

// Placeholder article, not real content.
function article(sourceUrl: string, publisher: NewsArticle["publisher"]): NewsArticle {
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: "Titre fictif",
      bodyHtml: "<p>Corps fictif.</p>",
      sourceUrl,
    },
  ];
  return {
    id: "00000000-0000-5000-8000-000000000001",
    kind: "news-article",
    publisher,
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: "2026-10-12",
    sourceUpdatedAt: null,
    fetchedAt: "2026-10-12T08:00:00Z",
    contentHash: "a".repeat(64),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

describe("pushMessageFor", () => {
  it("names the article's own official site as its source, never presidence.sn by default", () => {
    expect(
      pushMessageFor(article("https://www.sante.gouv.sn/Actualites/test", "sante"), undefined)
        ?.source,
    ).toBe("sante.gouv.sn");
    expect(
      pushMessageFor(
        article("https://primature.sn/publications/actualites/test", "primature"),
        undefined,
      )?.source,
    ).toBe("primature.sn");
  });
});
