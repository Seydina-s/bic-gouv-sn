import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { Institution, NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stableUuid } from "../lib/identity";
import { articleContentHash, mergeArticle } from "../merge";
import { isSameContent, reconcileDuplicates, saveCollected } from "./reconcile";

// Placeholder texts, not real content: numbered words, so overlaps are exact.
const words = (from: number, count: number) =>
  Array.from({ length: count }, (_, index) => `mot${String(from + index)}`).join(" ");

const PAGES: Record<Institution, string> = {
  presidence: "https://www.presidence.sn/fr/actualites/",
  primature: "https://primature.sn/publications/actualites/",
};

function article(
  publisher: Institution,
  slug: string,
  text: string,
  day = "2026-09-30",
): NewsArticle {
  const sourceUrl = `${PAGES[publisher]}${slug}`;
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title: slug, bodyHtml: `<p>${text}</p>`, sourceUrl },
  ];
  return {
    id: stableUuid(sourceUrl),
    kind: "news-article",
    publisher,
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: null,
    fetchedAt: "2026-10-09T10:00:00Z",
    contentHash: articleContentHash(translations, day, "actualites"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

const COUNCIL = words(0, 300);
const presidenceCouncil = article("presidence", "communique-du-conseil", COUNCIL);
const primatureCouncil = article("primature", "conseil-des-ministres", COUNCIL, "2026-10-01");

describe("isSameContent", () => {
  it("recognises the same communiqué under two titles, a day apart", () => {
    expect(isSameContent(presidenceCouncil, primatureCouncil)).toBe(true);
  });

  it("keeps apart a short note quoted inside a long communiqué", () => {
    const note = article("primature", "nomination", words(100, 60));
    expect(isSameContent(presidenceCouncil, note)).toBe(false);
  });

  it("keeps apart the same text published weeks apart", () => {
    const later = article("primature", "rappel", COUNCIL, "2026-10-20");
    expect(isSameContent(presidenceCouncil, later)).toBe(false);
  });

  it("keeps apart different texts of the same day", () => {
    const audience = article("primature", "audience", words(1000, 300));
    expect(isSameContent(presidenceCouncil, audience)).toBe(false);
  });

  it("never matches an article without a date", () => {
    const undated = { ...primatureCouncil, sourcePublishedOn: null };
    expect(isSameContent(presidenceCouncil, undated)).toBe(false);
  });
});

describe("one content, one article", () => {
  let dir: string;
  let repository: FileArticleRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-duplicates-"));
    repository = new FileArticleRepository(join(dir, "news.json"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function shownIds(): Promise<string[]> {
    return (await repository.list({ limit: 10, lang: "fr" })).items.map((item) => item.id);
  }

  async function expectPresidenceKept(): Promise<void> {
    expect(await shownIds()).toEqual([presidenceCouncil.id]);
    expect((await repository.get(primatureCouncil.id))?.duplicateOf).toBe(presidenceCouncil.id);
    expect((await repository.get(presidenceCouncil.id))?.alsoPublishedBy).toEqual([
      { publisher: "primature", sourceUrl: primatureCouncil.sourceUrl },
    ]);
  }

  it("hides the Primature's repeat collected after the Présidence's article", async () => {
    await saveCollected(repository, presidenceCouncil);
    await saveCollected(repository, primatureCouncil);
    await expectPresidenceKept();
  });

  it("hides the Primature's article when the Présidence publishes the same later", async () => {
    await saveCollected(repository, primatureCouncil);
    expect(await shownIds()).toEqual([primatureCouncil.id]);
    await saveCollected(repository, presidenceCouncil);
    await expectPresidenceKept();
  });

  it("keeps both marks when either article is collected again", async () => {
    await saveCollected(repository, presidenceCouncil);
    await saveCollected(repository, primatureCouncil);
    for (const fresh of [presidenceCouncil, primatureCouncil]) {
      const edited = {
        ...fresh,
        translations: fresh.translations.map((t) => ({ ...t, title: `${t.title} (corrigé)` })),
      };
      await saveCollected(repository, mergeArticle(await repository.get(fresh.id), edited));
    }
    await expectPresidenceKept();
  });

  it("lists the repeat once, however often it is reconciled", async () => {
    await saveCollected(repository, presidenceCouncil);
    await saveCollected(repository, primatureCouncil);
    const stored = await repository.get(primatureCouncil.id);
    expect(stored === null ? [] : await reconcileDuplicates(repository, stored)).toEqual([]);
    await expectPresidenceKept();
  });

  it("shows a Primature article that repeats nothing", async () => {
    const audience = article("primature", "audience", words(1000, 300));
    await saveCollected(repository, presidenceCouncil);
    await saveCollected(repository, audience);
    expect((await shownIds()).sort()).toEqual([audience.id, presidenceCouncil.id].sort());
  });
});
