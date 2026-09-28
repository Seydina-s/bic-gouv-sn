import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { QuarantineError, SourceUnreachableError } from "./lib/errors";
import { articleContentHash } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";
import { findWithdrawn } from "./withdrawn";

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
const urlOf = (slug: string) => `https://www.presidence.sn/fr/actualites/${slug}/`;

function article(n: number, slug: string): NewsArticle {
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: `Titre ${slug}`,
      bodyHtml: "<p>Corps</p>",
      sourceUrl: urlOf(slug),
    },
  ];
  return {
    id: idOf(n),
    kind: "news-article",
    category: "communiques",
    sourceUrl: urlOf(slug),
    sourcePublishedOn: "2026-01-01",
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, "2026-01-01", "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** The source still lists article 1 only; article 2 is gone, article 3 is unlisted but readable. */
function source(): SourceProvider & { read: string[] } {
  const read: string[] = [];
  const listed: SourceArticleRef = {
    sourceId: 1,
    slug: "encore-la",
    lang: "fr",
    sourceUpdatedAt: "",
    coverSourceUrl: null,
  };
  return {
    read,
    listPage: () => Promise.resolve({ refs: [listed], lastPage: 1 }),
    articleIdFor: (ref) => idOf(ref.sourceId),
    downloadMedia: () => Promise.reject(new Error("unused")),
    fetchArticle: (ref) => {
      read.push(ref.slug);
      if (ref.slug === "retire") {
        return Promise.reject(new SourceUnreachableError(urlOf(ref.slug), 404));
      }
      if (ref.slug === "depublie") {
        return Promise.reject(
          new QuarantineError(urlOf(ref.slug), "article is not published at the source"),
        );
      }
      if (ref.slug === "panne") {
        return Promise.reject(new SourceUnreachableError(urlOf(ref.slug), 503));
      }
      return Promise.resolve(article(3, ref.slug));
    },
  };
}

let dir: string;
let repo: FileArticleRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-withdrawn-"));
  repo = new FileArticleRepository(join(dir, "news.json"));
  const stored = [
    article(1, "encore-la"),
    article(2, "retire"),
    article(3, "hors-liste"),
    article(4, "depublie"),
    article(5, "panne"),
  ];
  for (const item of stored) {
    await repo.save(item);
  }
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("findWithdrawn", () => {
  it("reads again only what the listing lost, and tells gone from a passing failure", async () => {
    const provider = source();
    const missing = await findWithdrawn(provider, repo, ["fr"]);
    expect(Object.fromEntries(missing.map(({ sourceUrl, check }) => [sourceUrl, check]))).toEqual({
      [urlOf("retire")]: "withdrawn",
      [urlOf("hors-liste")]: "still-published",
      [urlOf("depublie")]: "withdrawn",
      [urlOf("panne")]: "unconfirmed",
    });
    expect(provider.read).not.toContain("encore-la");
  });

  it("changes nothing in the store", async () => {
    await findWithdrawn(source(), repo, ["fr"]);
    expect((await repo.get(idOf(2)))?.version).toBe(1);
  });
});
