import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { articleContentHash, FileArticleRepository } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { toDetail } from "../news/present";
import { allArticles, record, recordingsToMake, type Synthesizer } from "./recordings";
import { currentRecording, spokenPieces, spokenTextHash } from "./spoken-text";

/** The value, or a failed test when it is missing. */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error("missing in the test data");
  }
  return value;
}

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;

function article(n: number, withWolof: boolean): NewsArticle {
  const url = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: `Titre fictif ${String(n)}`,
      bodyHtml: "<p>Premier paragraphe fictif.</p><p>Second paragraphe fictif.</p>",
      sourceUrl: url,
    },
  ];
  if (withWolof) {
    translations.push({
      lang: "wo",
      status: "machine",
      title: `Tur bu fictif ${String(n)}`,
      bodyHtml: "<p>Xaaj bu jëkk.</p>",
    });
  }
  const day = `2025-11-0${String(n)}`;
  return {
    id: idOf(n),
    kind: "news-article",
    category: "communiques",
    sourceUrl: url,
    sourcePublishedOn: day,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, day, "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** A fake voice: writes a small file where asked, fails the jobs listed. */
function voice(failing: string[] = []): Synthesizer & { jobs: string[] } {
  const jobs: string[] = [];
  const synthesize = async (requested: Parameters<Synthesizer>[0]) => {
    jobs.push(...requested.map((job) => job.id));
    return Promise.all(
      requested.map(async (job) => {
        if (failing.includes(job.id)) {
          return { id: job.id, ok: false as const, error: "voix en panne" };
        }
        await mkdir(dirname(job.out), { recursive: true });
        await writeFile(job.out, "mp3 fictif");
        return { id: job.id, ok: true as const, durationMs: 4000, bytes: 10, voiceId: "test" };
      }),
    );
  };
  return Object.assign(synthesize, { jobs });
}

let dir: string;
let articles: FileArticleRepository;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-voices-"));
  articles = new FileArticleRepository(join(dir, "news.json"));
  await articles.save(article(1, true));
  await articles.save(article(2, false));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the recordings of the articles", () => {
  it("reads the title then each paragraph, tied to these words by their hash", () => {
    const french = must(article(1, false).translations[0]);
    expect(spokenPieces(french)).toEqual([
      "Titre fictif 1",
      "Premier paragraphe fictif.",
      "Second paragraphe fictif.",
    ]);
    expect(spokenTextHash(["a"])).not.toBe(spokenTextHash(["b"]));
  });

  it("records the newest versions without one, then offers them in the article", async () => {
    const todo = recordingsToMake(await allArticles(articles), ["fr", "wo"], 10);
    expect(todo.map((item) => `${item.article.id}:${item.lang}`)).toEqual([
      `${idOf(2)}:fr`,
      `${idOf(1)}:fr`,
      `${idOf(1)}:wo`,
    ]);
    const synthesize = voice([`${idOf(1)}:wo`]);
    const report = await record(todo, { articles, mediaRoot: dir, synthesize, groupSize: 2 });
    expect(report).toMatchObject({ recorded: 2, audioMs: 8000 });
    expect(report.failed).toEqual([{ id: idOf(1), lang: "wo", error: "voix en panne" }]);

    const stored = must(await articles.get(idOf(1)));
    expect(stored.version).toBe(1);
    const detail = toDetail(stored, "fr", "https://media.test");
    expect(detail?.audio).toEqual({
      url: `https://media.test/${must(todo[1]).key}`,
      durationMs: 4000,
    });
    expect(toDetail(stored, "wo", "https://media.test")?.audio).toBeNull();
    // Recorded once: only the failed one is left to do.
    const left = recordingsToMake(await allArticles(articles), ["fr", "wo"], 10);
    expect(left.map((item) => item.lang)).toEqual(["wo"]);
  });

  it("no longer offers a recording once the words it reads have changed", async () => {
    const todo = recordingsToMake(await allArticles(articles), ["fr"], 1);
    await record(todo, { articles, mediaRoot: dir, synthesize: voice() });
    const stored = must(await articles.get(idOf(2)));
    const corrected = { ...must(stored.translations[0]), title: "Titre corrigé" };
    expect(currentRecording(stored, "fr", corrected)).toBeNull();
    expect(currentRecording(stored, "fr", must(stored.translations[0]))).not.toBeNull();
  });
});
