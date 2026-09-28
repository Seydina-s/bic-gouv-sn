import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleContentHash } from "../merge";
import type { SourceProvider } from "../sources/source-provider";
import { asPdfAttachment, attachDocuments, documentLinks } from "./attach-documents";
import { backfillDocuments } from "./backfill-documents";
import type { MediaStorage } from "./media-storage";

// Placeholder texts and addresses, not real content.
const ID = "00000000-0000-5000-8000-000000000042";
const PDF_URL = "https://www.presidence.sn/fr/assets/documents/test.pdf";
const BODY =
  `<p>Texte.<br /><a href="${PDF_URL}">Découvrir <strong>la brochure</strong></a> ` +
  `<a href="https://example.com/autre.pdf">ailleurs</a> <a href="${PDF_URL}">encore</a></p>`;
const PDF = Buffer.from("%PDF-1.7\n% document de test\n");

function article(): NewsArticle {
  const sourceUrl = "https://www.presidence.sn/fr/actualites/test/";
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title: "Titre", bodyHtml: BODY, sourceUrl },
  ];
  return {
    id: ID,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
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

class MemoryStorage implements MediaStorage {
  readonly files = new Map<string, Buffer>();
  size(key: string) {
    return Promise.resolve(this.files.get(key)?.length ?? null);
  }
  put(key: string, data: Buffer) {
    this.files.set(key, data);
    return Promise.resolve();
  }
}

function providerWith(downloadMedia: SourceProvider["downloadMedia"]): SourceProvider {
  return {
    articleIdFor: () => ID,
    downloadMedia,
    listPage: () => Promise.reject(new Error("unused")),
    fetchArticle: () => Promise.reject(new Error("unused")),
  };
}

let dir: string;
let repo: FileArticleRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-documents-"));
  repo = new FileArticleRepository(join(dir, "news.json"));
  await repo.save(article());
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("official PDF documents", () => {
  it("finds the official PDFs an article links to, once each, with the words of the link", () => {
    expect(documentLinks(article())).toEqual([{ url: PDF_URL, title: "Découvrir la brochure" }]);
  });

  it("keeps only real PDF files, named by their content", () => {
    expect(asPdfAttachment({ url: PDF_URL, title: null }, Buffer.from("<html>"))).toBeNull();
    expect(asPdfAttachment({ url: PDF_URL, title: null }, PDF)).toMatchObject({
      sourceUrl: PDF_URL,
      mimeType: "application/pdf",
      bytes: PDF.length,
      key: expect.stringMatching(/^documents\/[0-9a-f]{64}\.pdf$/) as unknown,
    });
  });

  it("stores our copy and attaches it, then skips it next time", async () => {
    const download = vi.fn(() => Promise.resolve(PDF));
    const storage = new MemoryStorage();
    const stored = (await repo.get(ID)) ?? article();
    expect(await attachDocuments(stored, providerWith(download), repo, storage)).toEqual({
      attached: 1,
      failures: [],
    });
    const saved = await repo.get(ID);
    expect(saved?.attachments).toHaveLength(1);
    expect(saved?.version).toBe(1);
    expect(storage.files.get(saved?.attachments[0]?.key ?? "")).toEqual(PDF);
    await attachDocuments(saved ?? article(), providerWith(download), repo, storage);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("also keeps the documents the source attaches apart, once each", async () => {
    const apart = "https://bo-admin.presidence.sn/storage/documents/compte-rendu.pdf";
    const download = vi.fn(() => Promise.resolve(PDF));
    const result = await attachDocuments(
      article(),
      providerWith(download),
      repo,
      new MemoryStorage(),
      [apart, PDF_URL, apart],
    );
    expect(result.attached).toBe(2);
    expect(
      (await repo.get(ID))?.attachments.map(({ sourceUrl, title }) => [sourceUrl, title]),
    ).toEqual([
      [PDF_URL, "Découvrir la brochure"],
      [apart, null],
    ]);
  });

  it("goes through the source listing to find the documents attached apart", async () => {
    const apart = "https://bo-admin.presidence.sn/storage/documents/compte-rendu.pdf";
    const ref = {
      sourceId: 42,
      slug: "test",
      lang: "fr" as const,
      sourceUpdatedAt: "",
      coverSourceUrl: null,
      documentUrls: [apart],
    };
    const provider: SourceProvider = {
      ...providerWith(() => Promise.resolve(PDF)),
      listPage: () => Promise.resolve({ refs: [ref, { ...ref, sourceId: 43 }], lastPage: 1 }),
      articleIdFor: ({ sourceId }) =>
        sourceId === 42 ? ID : "00000000-0000-5000-8000-000000000043",
    };
    const progress = await backfillDocuments(provider, repo, new MemoryStorage(), "fr");
    expect(progress).toEqual({ articles: 1, attached: 2, failures: [] });
  });

  it("reports what is not a PDF, or cannot be downloaded, without blocking the article", async () => {
    const storage = new MemoryStorage();
    const notPdf = providerWith(() => Promise.resolve(Buffer.from("<html>erreur</html>")));
    const result = await attachDocuments(article(), notPdf, repo, storage);
    expect(result.failures.map((failure) => failure.code)).toEqual(["MEDIA_PROCESSING_FAILED"]);
    expect((await repo.get(ID))?.attachments).toEqual([]);
    expect(storage.files.size).toBe(0);
  });
});
