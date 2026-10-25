import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository, fileDocument } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { discardArticles, refusedArticles, type DiscardedEntry } from "./discard";
import { articleContentHash } from "./merge";

// Placeholder texts, not real content.
const LONG_FRENCH =
  "<p>Le Ministre a présidé la réunion fictive des délégués à Dakar, avec les services concernés.</p>";
const SAMPLE =
  "<p>Bienvenue sur WordPress. Ceci est votre premier article. Modifiez-le ou supprimez-le.</p>";

function article(n: number, title: string, bodyHtml: string): NewsArticle {
  const sourceUrl = `https://industriecommerce.gouv.sn/article-${String(n)}/`;
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "news-article",
    publisher: "industrie-commerce",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2024-05-02",
    sourceUpdatedAt: null,
    fetchedAt: "2026-10-09T10:00:00Z",
    contentHash: articleContentHash(translations, "2024-05-02", "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

describe("stored articles the rules now refuse (DATA-10)", () => {
  let dir: string;
  let articles: FileArticleRepository;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-discard-"));
    articles = new FileArticleRepository(join(dir, "news.json"));
    await articles.saveMany([
      article(1, "Bonjour tout le monde !", SAMPLE),
      article(2, "Réunion fictive", LONG_FRENCH),
      article(3, "Bonjour fictif article2", SAMPLE),
    ]);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("are listed with the reason, the others not", async () => {
    const refused = await refusedArticles(articles);
    expect(refused.map((item) => [item.title, item.reason])).toEqual(
      expect.arrayContaining([
        ["Bonjour tout le monde !", "WordPress sample post"],
        ["Bonjour fictif article2", "WordPress sample post"],
      ]),
    );
    expect(refused).toHaveLength(2);
  });

  it("are deleted by id only, each kept whole first; an accepted article never", async () => {
    const kept = fileDocument(join(dir, "discarded-articles.json"));
    const [sample, accepted] = [article(1, "", "").id, article(2, "", "").id];
    const outcome = await discardArticles(
      articles,
      kept,
      [sample, accepted, "unknown"],
      () => new Date("2026-10-25T15:00:00Z"),
    );
    expect(outcome).toEqual({ deleted: [sample], kept: [accepted, "unknown"] });
    expect(await articles.get(sample)).toBeNull();
    expect(await articles.get(accepted)).not.toBeNull();
    expect(await articles.get(article(3, "", "").id)).not.toBeNull();
    const saved = (await kept.read()) as DiscardedEntry[];
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({
      discardedAt: "2026-10-25T15:00:00.000Z",
      reason: "WordPress sample post",
      entry: { current: { id: sample, version: 1 }, history: [] },
    });
  });
});
