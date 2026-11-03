import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository, fileDocument } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleContentHash } from "../merge";
import { ClaudeBatches, type BatchRequest, type BatchResult } from "./claude-batches";
import { BATCH_PRICES, MEASURED_OVERRUN } from "./cost-estimate";
import { ArticleTranslation, fitsOneReply, outputTokensFor } from "./article-translation";
import type { BatchClient } from "./batch-translation";
import { ENGLISH, WOLOF as WOLOF_TARGET } from "./targets";
import { trialPicks } from "./wolof-candidates";

// Placeholder articles, not real content.
const idOf = (n: number) => `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`;
const FRENCH = "<p>Un texte français fictif pour les essais de traduction.</p>";
const WOLOF = "<p>Mbind mu fictif ngir seetlu yi, ak ay baat yu bari ci.</p>";

function article(n: number, publishedOn: string): NewsArticle {
  const url = `https://www.presidence.sn/fr/actualites/test-${String(n)}/`;
  const translations: NewsArticle["translations"] = [
    {
      lang: "fr",
      status: "official",
      title: `Titre ${String(n)}`,
      bodyHtml: FRENCH,
      sourceUrl: url,
    },
  ];
  return {
    id: idOf(n),
    kind: "news-article",
    publisher: "presidence",
    alsoPublishedBy: [],
    category: "communiques",
    sourceUrl: url,
    sourcePublishedOn: publishedOn,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-25T10:00:00Z",
    contentHash: articleContentHash(translations, publishedOn, "communiques"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
}

/** A fake batch service: what was sent, and the replies it gives once ended. */
function batches(reply: (request: BatchRequest) => BatchResult) {
  const sent: BatchRequest[][] = [];
  let ended = false;
  const client: BatchClient = {
    create: (requests) => {
      sent.push([...requests]);
      return Promise.resolve(`batch-${String(sent.length)}`);
    },
    status: () =>
      Promise.resolve(
        ended
          ? { status: "ended", resultsUrl: "https://x/results" }
          : { status: "in_progress", resultsUrl: null },
      ),
    results: () => Promise.resolve(sent.flat().map(reply)),
  };
  return {
    client,
    sent,
    end: () => {
      ended = true;
    },
  };
}

/** A successful batch reply carrying `text`, as the model would write it. */
const replyWith =
  (text: string) =>
  (request: BatchRequest): BatchResult => ({
    customId: request.customId,
    ok: true,
    text,
    inputTokens: 1000,
    outputTokens: 200,
    truncated: false,
  });

const translated = replyWith(JSON.stringify({ title: "Tur bu fictif", bodyHtml: WOLOF }));

let dir: string;
let articles: FileArticleRepository;
let translation: ArticleTranslation;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-translation-"));
  articles = new FileArticleRepository(join(dir, "news.json"));
  await articles.save(article(1, "2025-11-02"));
  await articles.save(article(2, "2025-10-05"));
  await articles.save(article(3, "2025-09-01"));
  translation = new ArticleTranslation({
    articles,
    target: WOLOF_TARGET,
    state: fileDocument(join(dir, "runs.json")),
    now: () => new Date("2026-10-08T10:00:00Z"),
  });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the Wolof translation runs", () => {
  it("sends the articles without Wolof once, then saves the checked translations as machine ones", async () => {
    const service = batches(translated);
    expect(
      await translation.submit(service.client, "claude-opus-5-5", {
        since: "2025-10-01",
        limit: 10,
      }),
    ).toEqual({
      sent: 2,
      batchId: "batch-1",
    });
    expect(service.sent[0]?.map((request) => request.customId)).toEqual([idOf(1), idOf(2)]);
    // Already sent: not sent again while the run is processed.
    expect(
      (
        await translation.submit(service.client, "claude-opus-5-5", {
          since: "2025-10-01",
          limit: 10,
        })
      ).sent,
    ).toBe(0);

    expect((await translation.collect(service.client)).stillRunning).toBe(1);
    service.end();
    const report = await translation.collect(service.client);
    expect(report).toMatchObject({
      saved: 2,
      failed: 0,
      outdated: 0,
      inputTokens: 2000,
      outputTokens: 400,
    });

    const saved = await articles.get(idOf(1));
    expect(saved?.translations.find((t) => t.lang === "wo")).toEqual({
      lang: "wo",
      status: "machine",
      title: "Tur bu fictif",
      bodyHtml: WOLOF,
    });
    expect(saved?.version).toBe(2);
    // Collected once: a second collection does nothing.
    expect((await translation.collect(service.client)).saved).toBe(0);
    expect((await translation.pending(null)).toSend.map((a) => a.id)).toEqual([idOf(3)]);
  });

  it("saves nothing refused by the checks, failed, or for an article changed meanwhile", async () => {
    const service = batches((request) => {
      if (request.customId === idOf(1)) {
        return { ...translated(request), text: "pas du JSON" };
      }
      if (request.customId === idOf(4)) {
        // Stopped at its length limit: a complete-looking start, never saved.
        return { ...translated(request), truncated: true };
      }
      return request.customId === idOf(2)
        ? { customId: request.customId, ok: false, reason: "errored" }
        : translated(request);
    });
    await articles.save(article(4, "2025-08-01"));
    await translation.submit(service.client, "claude-opus-5-5", { since: null, limit: 4 });
    // Article 3 is corrected at the source while its translation is being written.
    const original = article(3, "2025-09-01");
    const translations = original.translations.map((t) => ({ ...t, title: "Titre corrigé" }));
    await articles.save({
      ...original,
      translations,
      contentHash: articleContentHash(translations, "2025-09-01", "communiques"),
    });
    service.end();
    const report = await translation.collect(service.client);
    expect(report).toMatchObject({
      saved: 0,
      refused: { unreadable: 1, truncated: 1 },
      failed: 1,
      outdated: 1,
    });
    for (const n of [1, 2, 3, 4]) {
      expect((await articles.get(idOf(n)))?.translations).toHaveLength(1);
    }
  });

  it("translates an article too long for one reply in parts, joined back and checked whole", async () => {
    // ML-12c: up to 117 000 characters; here 700 paragraphs, about 42 000.
    const long = article(9, "2025-12-15");
    const translations = [
      { ...long.translations[0], bodyHtml: FRENCH.repeat(700) },
    ] as NewsArticle["translations"];
    await articles.save({
      ...long,
      translations,
      contentHash: articleContentHash(translations, long.sourcePublishedOn, long.category),
    });
    // Each part comes back with as many paragraphs as it was sent.
    const inParts = batches((request) => {
      const sent = JSON.parse(request.user.slice("<article>".length, -"</article>".length)) as {
        bodyHtml: string;
      };
      const paragraphs = sent.bodyHtml.split("</p>").length - 1;
      return replyWith(
        JSON.stringify({ title: "Tur bu fictif", bodyHtml: WOLOF.repeat(paragraphs) }),
      )(request);
    });
    await translation.submit(inParts.client, "claude-sonnet-5-5", {
      since: "2025-12-01",
      limit: 10,
    });
    const ids = inParts.sent[0]?.map((request) => request.customId) ?? [];
    expect(ids.length).toBeGreaterThan(1);
    expect(ids.every((id) => id.startsWith(`${idOf(9)}_part`))).toBe(true);
    expect(inParts.sent[0]?.every((request) => request.maxOutputTokens <= 64_000)).toBe(true);
    inParts.end();
    expect(await translation.collect(inParts.client)).toMatchObject({ saved: 1, refused: {} });
    const wolof = (await articles.get(idOf(9)))?.translations.find((t) => t.lang === "wo");
    expect(wolof?.title).toBe("Tur bu fictif");
    expect(wolof?.bodyHtml.split("</p>").length).toBe(701);
  });

  it("saves the translations of a run together, not one write per article", async () => {
    const service = batches(translated);
    await translation.submit(service.client, "claude-sonnet-5-5", { since: null, limit: 10 });
    service.end();
    const saveMany = vi.spyOn(articles, "saveMany");
    const save = vi.spyOn(articles, "save");
    expect(await translation.collect(service.client)).toMatchObject({ saved: 3 });
    expect(saveMany).toHaveBeenCalledTimes(1);
    expect(saveMany.mock.calls[0]?.[0]).toHaveLength(3);
    expect(save).not.toHaveBeenCalled();
  });

  it("sends again an article refused before the last change of the checks", async () => {
    // The clock of these tests (8 October) is before that change.
    const refusing = batches(replyWith("pas du JSON"));
    refusing.end();
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      await translation.submit(refusing.client, "claude-sonnet-5-5", {
        since: "2025-11-01",
        limit: 10,
      });
      await translation.collect(refusing.client);
    }
    expect((await translation.pending("2025-11-01")).toSend.map((a) => a.id)).toEqual([idOf(1)]);
  });

  it("no longer sends an article refused twice in the same version (22/10/2026)", async () => {
    translation = new ArticleTranslation({
      articles,
      target: WOLOF_TARGET,
      state: fileDocument(join(dir, "runs.json")),
      now: () => new Date("2026-10-23T10:00:00Z"),
    });
    const refusing = batches(replyWith("pas du JSON"));
    refusing.end();
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      expect((await translation.pending("2025-11-01")).toSend.map((a) => a.id)).toEqual([idOf(1)]);
      await translation.submit(refusing.client, "claude-sonnet-5-5", {
        since: "2025-11-01",
        limit: 10,
      });
      expect(await translation.collect(refusing.client)).toMatchObject({ saved: 0 });
    }
    // Twice refused: not paid for a third time.
    expect((await translation.pending("2025-11-01")).toSend).toEqual([]);
    // A new version at the source is tried again.
    const edited = article(1, "2025-11-02");
    const translations = [
      { ...edited.translations[0], title: "Titre corrigé" },
    ] as NewsArticle["translations"];
    await articles.save({
      ...edited,
      translations,
      contentHash: articleContentHash(translations, edited.sourcePublishedOn, edited.category),
    });
    expect((await translation.pending("2025-11-01")).toSend.map((a) => a.id)).toEqual([idOf(1)]);
  });

  it("gives the Wolof room to be longer than the French, within bounds", () => {
    expect(outputTokensFor(100)).toBe(2048);
    expect(outputTokensFor(10_000)).toBe(13_000);
    expect(outputTokensFor(1_000_000)).toBe(64_000);
    // Wolof: twice the French, since 1.2 cut long articles short (17/10/2026).
    expect(outputTokensFor(10_000, WOLOF_TARGET.room)).toBe(21_000);
    // Longer than one reply can hold: never sent, to be cut in parts later.
    expect(fitsOneReply(31_000, WOLOF_TARGET.room)).toBe(true);
    expect(fitsOneReply(32_000, WOLOF_TARGET.room)).toBe(false);
  });

  it("estimates the cost before anything is sent", async () => {
    const estimate = await translation.estimate({ since: null, limit: 1000 }, [
      ...Object.keys(BATCH_PRICES),
      "modele-inconnu",
    ]);
    expect(estimate.items).toBe(3);
    expect((await translation.estimate({ since: "2025-10-01", limit: 1 }, [])).items).toBe(1);
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.dollars["claude-opus-5-5"]).toBeGreaterThan(
      estimate.dollars["claude-haiku-4-5-20251001"] ?? 0,
    );
    expect(estimate.dollars["modele-inconnu"]).toBeNull();
    const listed = (estimate.inputTokens * 2 + estimate.outputTokens * 10) / 1_000_000;
    expect(estimate.dollars["claude-opus-5-5"]).toBeCloseTo(listed * MEASURED_OVERRUN, 10);
    // Sonnet 5.5, chosen on 16/10/2026, costs half of Opus 5.5.
    expect(estimate.dollars["claude-sonnet-5-5"]).toBeCloseTo(
      (estimate.dollars["claude-opus-5-5"] ?? 0) / 2,
      10,
    );
  });
});

describe("the English translation runs", () => {
  const english = () =>
    new ArticleTranslation({
      articles,
      target: ENGLISH,
      state: fileDocument(join(dir, "runs-en.json")),
    });
  const inEnglish = replyWith(
    JSON.stringify({
      title: "A made-up title",
      bodyHtml: "<p>A made-up English text for the translation tests.</p>",
    }),
  );

  it("translates every article without English, Wolof ones included, and saves it as English", async () => {
    const wolof = article(4, "2025-12-01");
    const translations = [
      ...wolof.translations,
      {
        lang: "wo" as const,
        status: "official" as const,
        title: "Tur",
        bodyHtml: WOLOF,
        sourceUrl: "https://www.presidence.sn/wo/actualites/test-4/",
      },
    ];
    await articles.save({ ...wolof, translations });
    const service = batches(inEnglish);
    const runs = english();
    expect(
      await runs.submit(service.client, "claude-sonnet-5-5", { since: null, limit: 10 }),
    ).toMatchObject({ sent: 4 });
    expect(service.sent[0]?.[0]?.system).toContain("into English");
    service.end();
    expect(await runs.collect(service.client)).toMatchObject({ saved: 4 });
    const saved = await articles.get(idOf(4));
    expect(saved?.translations.map((t) => `${t.lang}:${t.status}`)).toEqual([
      "fr:official",
      "wo:official",
      "en:machine",
    ]);
    // A second run finds nothing left to translate into English.
    expect(await runs.pending(null)).toMatchObject({ toSend: [] });
  });

  it("keeps its runs apart from the Wolof ones", async () => {
    const service = batches(inEnglish);
    await translation.submit(service.client, "claude-sonnet-5-5", { since: null, limit: 1 });
    // The Wolof run in progress does not hold the article back from English.
    expect((await english().pending(null)).toSend).toHaveLength(3);
  });

  it("never sets aside the Wolof replies once the English was saved, even collected again", async () => {
    // 17/10/2026: saving the English changed every article's fingerprint, and 2 562
    // Wolof replies were taken for articles changed meanwhile.
    const wolof = batches(translated);
    const inEnglishToo = batches(inEnglish);
    await translation.submit(wolof.client, "claude-sonnet-5-5", { since: null, limit: 10 });
    const runs = english();
    await runs.submit(inEnglishToo.client, "claude-sonnet-5-5", { since: null, limit: 10 });
    inEnglishToo.end();
    expect(await runs.collect(inEnglishToo.client)).toMatchObject({ saved: 3 });
    wolof.end();
    expect(await translation.collect(wolof.client)).toMatchObject({ saved: 3, outdated: 0 });
    expect((await articles.get(idOf(1)))?.translations.map((t) => t.lang)).toEqual([
      "fr",
      "en",
      "wo",
    ]);
    // Collected again after a fix: nothing saved twice.
    expect(await translation.recollectRecent(wolof.client)).toMatchObject({
      saved: 0,
      outdated: 3,
    });
  });
});

describe("a trial", () => {
  it("sends the chosen articles, then gives the checked replies without saving any", async () => {
    const service = batches(translated);
    const chosen = trialPicks(
      [
        article(5, "2024-05-01"),
        article(6, "2024-01-01"),
        {
          ...article(7, "2025-01-01"),
          publisher: "primature" as const,
          sourceUrl: "https://primature.sn/publications/actualites/test-7",
        },
      ],
      10,
    );
    // Since the current government only, one article per institution.
    expect(chosen.map((a) => a.id)).toEqual([idOf(7), idOf(5)]);
    await articles.save(article(5, "2024-05-01"));
    const batchId = await translation.submitTrial(service.client, [article(5, "2024-05-01")]);
    expect(await translation.trialReplies(service.client, batchId)).toBeNull();
    service.end();
    const replies = await translation.trialReplies(service.client, batchId);
    expect(replies).toEqual([
      expect.objectContaining({
        id: idOf(5),
        translation: { title: "Tur bu fictif", bodyHtml: WOLOF },
        problem: null,
      }),
    ]);
    // Nothing saved, nothing remembered: a full run still takes the article.
    expect((await articles.get(idOf(5)))?.translations).toHaveLength(1);
    expect((await translation.pending(null)).toSend.map((a) => a.id)).toContain(idOf(5));
  });

  it("says why a reply was refused", async () => {
    const service = batches(replyWith("pas du JSON"));
    const batchId = await translation.submitTrial(service.client, [article(1, "2025-11-02")]);
    service.end();
    expect(await translation.trialReplies(service.client, batchId)).toEqual([
      expect.objectContaining({ translation: null, problem: "unreadable" }),
    ]);
  });
});

describe("Anthropic's batches", () => {
  function replying(...responses: Response[]) {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(responses.shift() ?? new Response("", { status: 500 })),
    );
    return {
      fetchImpl,
      batches: new ClaudeBatches({ apiKey: "test-key", model: "claude-opus-5-5", fetchImpl }),
    };
  }

  it("sends the requests with cached rules, then reads the status and the results", async () => {
    const lines = [
      {
        custom_id: "a",
        result: {
          type: "succeeded",
          message: {
            content: [{ type: "text", text: "{}" }],
            usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 90 },
          },
        },
      },
      { custom_id: "b", result: { type: "expired" } },
    ];
    const { fetchImpl, batches } = replying(
      new Response(JSON.stringify({ id: "msgbatch_1", processing_status: "in_progress" })),
      new Response(
        JSON.stringify({
          id: "msgbatch_1",
          processing_status: "ended",
          results_url: "https://api.anthropic.com/r",
        }),
      ),
      new Response(`${lines.map((line) => JSON.stringify(line)).join("\n")}\n`),
    );
    expect(
      await batches.create([{ customId: "a", system: "S", user: "U", maxOutputTokens: 1024 }]),
    ).toBe("msgbatch_1");
    const body = JSON.parse(fetchImpl.mock.calls[0]?.[1]?.body as string) as {
      requests: { params: Record<string, unknown> }[];
    };
    expect(body.requests[0]?.params).toMatchObject({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      system: [{ type: "text", text: "S", cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "U" }],
    });
    expect(fetchImpl.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-api-key": "test-key" });
    expect(await batches.status("msgbatch_1")).toEqual({
      status: "ended",
      resultsUrl: "https://api.anthropic.com/r",
    });
    expect(await batches.results("https://api.anthropic.com/r")).toEqual([
      { customId: "a", ok: true, text: "{}", inputTokens: 100, outputTokens: 5, truncated: false },
      { customId: "b", ok: false, reason: "expired" },
    ]);
  });

  it("fails with the status of a refused call, never with the key", async () => {
    const { batches } = replying(new Response("{}", { status: 401 }));
    await expect(batches.status("x")).rejects.toThrow("Anthropic batches answered 401");
  });

  it("says the reason the service gives for a refusal", async () => {
    const refusal = {
      type: "error",
      error: { type: "invalid_request_error", message: "fictive reason" },
    };
    const { batches } = replying(new Response(JSON.stringify(refusal), { status: 400 }));
    await expect(batches.status("x")).rejects.toThrow(
      "Anthropic batches answered 400: fictive reason",
    );
  });
});
