import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleContentHash } from "../merge";
import type { SourceArticleRef, SourceProvider } from "../sources/source-provider";
import { attachCover } from "./attach-cover";
import { backfillCovers } from "./backfill-covers";
import { FileMediaStorage, type MediaStorage } from "./media-storage";
import { SSIM_FLOOR, processImage } from "./process-image";
import { ssim } from "./ssim";

/** A synthetic photo-like picture (gradients + shapes), not an official asset. */
function testPhoto(width: number, height: number, format: "jpeg" | "png" = "jpeg") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b5e20"/><stop offset="1" stop-color="#f9a825"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${String(width / 3)}" cy="${String(height / 2)}" r="${String(height / 4)}" fill="#c62828"/>
    <rect x="${String(width / 2)}" y="${String(height / 5)}" width="${String(width / 4)}" height="${String(height / 2)}" fill="#fafafa"/>
  </svg>`;
  return sharp(Buffer.from(svg))[format]().toBuffer();
}

class MemoryMediaStorage implements MediaStorage {
  readonly files = new Map<string, Buffer>();
  exists(key: string) {
    return Promise.resolve(this.files.has(key));
  }
  put(key: string, data: Buffer) {
    this.files.set(key, data);
    return Promise.resolve();
  }
}

const SOURCE_URL = "https://bo-admin.presidence.sn/storage/image/actualites/test.jpg";

describe("ssim", () => {
  it("is 1 for identical images and lower for different ones", () => {
    const flat = new Uint8Array(64).fill(100);
    const noisy = flat.map((value, index) => value + (index % 2 === 0 ? 40 : -40));
    expect(ssim(flat, flat, 8, 8)).toBeCloseTo(1, 10);
    expect(ssim(flat, noisy, 8, 8)).toBeLessThan(0.5);
  });

  it("is 1 when the image is smaller than one window", () => {
    expect(ssim(new Uint8Array(4), new Uint8Array(4), 2, 2)).toBe(1);
  });

  it("refuses images of different sizes", () => {
    expect(() => ssim(new Uint8Array(4), new Uint8Array(6), 2, 2)).toThrow(/declared size/);
  });
});

describe("processImage", () => {
  it("keeps the original and produces light variants faithful to it", async () => {
    const storage = new MemoryMediaStorage();
    const original = await testPhoto(1200, 800);
    const { image, lowestSsim } = await processImage(
      { original, sourceUrl: SOURCE_URL, alt: null },
      storage,
    );

    expect(image).toMatchObject({ originalUrl: SOURCE_URL, width: 1200, height: 800, alt: null });
    expect(storage.files.get(image.originalKey)).toBe(original);
    expect(image.variants.map((v) => `${v.format}@${String(v.width)}`)).toEqual([
      "avif@480",
      "webp@480",
      "jpeg@480",
      "avif@960",
      "webp@960",
      "jpeg@960",
    ]);
    for (const variant of image.variants) {
      expect(storage.files.get(variant.key)?.length).toBe(variant.bytes);
      expect(variant.bytes).toBeLessThan(original.length);
    }
    expect(lowestSsim).toBeGreaterThanOrEqual(SSIM_FLOOR);
    expect(image.blurhash.length).toBeGreaterThanOrEqual(6);
  });

  it("never upscales a small image and keeps a PNG original as PNG", async () => {
    const storage = new MemoryMediaStorage();
    const { image } = await processImage(
      { original: await testPhoto(300, 200, "png"), sourceUrl: SOURCE_URL, alt: "Légende" },
      storage,
    );
    expect(image.originalKey).toMatch(/original\.png$/);
    expect(new Set(image.variants.map((v) => v.width))).toEqual(new Set([300]));
    expect(image.alt).toBe("Légende");
  });

  it("is idempotent: same source, same keys, original written once", async () => {
    const storage = new MemoryMediaStorage();
    const put = vi.spyOn(storage, "put");
    const original = await testPhoto(500, 300);
    const first = await processImage({ original, sourceUrl: SOURCE_URL, alt: null }, storage);
    const second = await processImage({ original, sourceUrl: SOURCE_URL, alt: null }, storage);
    expect(second.image).toEqual(first.image);
    const originalWrites = put.mock.calls.filter(([key]) => key === first.image.originalKey);
    expect(originalWrites).toHaveLength(1);
  });
});

describe("FileMediaStorage", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-media-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes files under its root and reports them as existing", async () => {
    const storage = new FileMediaStorage(dir);
    expect(await storage.exists("images/a/480.webp")).toBe(false);
    await storage.put("images/a/480.webp", Buffer.from("x"));
    expect(await storage.exists("images/a/480.webp")).toBe(true);
    expect(await readFile(join(dir, "images", "a", "480.webp"), "utf8")).toBe("x");
  });

  it("refuses keys that would escape its root", async () => {
    const storage = new FileMediaStorage(dir);
    await expect(storage.put("../evil.jpg", Buffer.from("x"))).rejects.toThrow();
    await expect(storage.put("/etc/passwd", Buffer.from("x"))).rejects.toThrow();
  });
});

const ID = "00000000-0000-5000-8000-000000000001";

// Placeholder texts, not real content.
function storedArticle(): NewsArticle {
  const sourceUrl = "https://www.presidence.sn/fr/actualites/test/";
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title: "Titre", bodyHtml: "<p>Corps</p>", sourceUrl },
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

describe("attachCover", () => {
  let dir: string;
  let repo: FileArticleRepository;
  const ref: SourceArticleRef = {
    sourceId: 1,
    slug: "test",
    lang: "fr",
    sourceUpdatedAt: "",
    coverSourceUrl: SOURCE_URL,
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-cover-"));
    repo = new FileArticleRepository(join(dir, "news.json"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  function providerWith(downloadMedia: SourceProvider["downloadMedia"]): SourceProvider {
    return {
      articleIdFor: () => ID,
      downloadMedia,
      listPage: () => Promise.reject(new Error("unused")),
      fetchArticle: () => Promise.reject(new Error("unused")),
    };
  }

  it("downloads, processes and attaches the cover, then skips it next time", async () => {
    await repo.save(storedArticle());
    const photo = await testPhoto(600, 400);
    const download = vi.fn(() => Promise.resolve(photo));
    const provider = providerWith(download);
    const storage = new MemoryMediaStorage();

    expect(await attachCover(ref, provider, repo, storage)).toBe("attached");
    const saved = await repo.get(ID);
    expect(saved?.images[0]?.originalUrl).toBe(SOURCE_URL);
    expect(saved?.version).toBe(1);

    expect(await attachCover(ref, provider, repo, storage)).toBe("already-done");
    expect(download).toHaveBeenCalledTimes(1);
  });

  it("never lets another language version replace the primary cover", async () => {
    await repo.save(storedArticle());
    const photo = await testPhoto(600, 400);
    const download = vi.fn(() => Promise.resolve(photo));
    const provider = providerWith(download);
    const storage = new MemoryMediaStorage();
    await attachCover(ref, provider, repo, storage);
    const wolof = { ...ref, lang: "wo" as const, coverSourceUrl: `${SOURCE_URL}?wo` };
    expect(await attachCover(wolof, provider, repo, storage)).toBe("already-done");
    expect((await repo.get(ID))?.images[0]?.originalUrl).toBe(SOURCE_URL);
  });

  it("reports a download or processing failure as a media error", async () => {
    await repo.save(storedArticle());
    const storage = new MemoryMediaStorage();
    const broken = providerWith(() => Promise.resolve(Buffer.from("not an image")));
    await expect(attachCover(ref, broken, repo, storage)).rejects.toMatchObject({
      code: "MEDIA_PROCESSING_FAILED",
    });
    expect((await repo.get(ID))?.images).toEqual([]);
  });

  it("backfills the covers of a listing, page after page, and reports failures", async () => {
    await repo.save(storedArticle());
    const photo = await testPhoto(600, 400);
    const refs: SourceArticleRef[] = [
      ref,
      { ...ref, sourceId: 2, slug: "absent" },
      { ...ref, sourceId: 3, slug: "sans-photo", coverSourceUrl: null },
    ];
    const provider: SourceProvider = {
      ...providerWith(() => Promise.resolve(photo)),
      articleIdFor: (r) =>
        r.sourceId === 1 ? ID : `00000000-0000-5000-8000-00000000000${String(r.sourceId)}`,
      listPage: (_lang, page) => Promise.resolve({ refs: page === 1 ? refs : [], lastPage: 2 }),
    };
    const pages: number[] = [];
    const result = await backfillCovers(provider, repo, new MemoryMediaStorage(), "fr", {
      onPage: (p) => pages.push(p.page),
    });
    expect(pages).toEqual([1, 2]);
    expect(result.outcomes).toEqual({
      attached: 1,
      "already-done": 0,
      "no-cover": 1,
      "unknown-article": 1,
    });

    const failing: SourceProvider = {
      ...provider,
      downloadMedia: () => Promise.reject(new Error("down")),
    };
    const other = { ...ref, coverSourceUrl: `${SOURCE_URL}?v2` };
    const retry = await backfillCovers(
      { ...failing, listPage: () => Promise.resolve({ refs: [other], lastPage: 1 }) },
      repo,
      new MemoryMediaStorage(),
      "fr",
      { maxPages: 1 },
    );
    expect(retry.failures).toEqual([
      expect.objectContaining({ ref: "test", code: "MEDIA_PROCESSING_FAILED" }),
    ]);
  });

  it("does nothing without a cover or for an article not stored yet", async () => {
    const provider = providerWith(() => Promise.reject(new Error("unused")));
    const storage = new MemoryMediaStorage();
    expect(await attachCover({ ...ref, coverSourceUrl: null }, provider, repo, storage)).toBe(
      "no-cover",
    );
    expect(await attachCover(ref, provider, repo, storage)).toBe("unknown-article");
  });
});
