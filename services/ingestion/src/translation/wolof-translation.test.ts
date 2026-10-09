import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArticleRepository, fileDocument } from "@bgs/content-store";
import type { NewsArticle } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleContentHash } from "../merge";
import { ClaudeBatches, type BatchRequest, type BatchResult } from "./claude-batches";
import { BATCH_PRICES, estimateCost, MEASURED_OVERRUN } from "./cost-estimate";
import { outputTokensFor, WolofTranslation, type BatchClient } from "./wolof-translation";

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

const translated = (request: BatchRequest): BatchResult => ({
  customId: request.customId,
  ok: true,
  text: JSON.stringify({ title: "Tur bu fictif", bodyHtml: WOLOF }),
  inputTokens: 1000,
  outputTokens: 200,
  truncated: false,
});

let dir: string;
let articles: FileArticleRepository;
let translation: WolofTranslation;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-translation-"));
  articles = new FileArticleRepository(join(dir, "news.json"));
  await articles.save(article(1, "2025-11-02"));
  await articles.save(article(2, "2025-10-05"));
  await articles.save(article(3, "2025-09-01"));
  translation = new WolofTranslation({
    articles,
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

  it("gives the Wolof room to be longer than the French, within bounds", () => {
    expect(outputTokensFor(100)).toBe(2048);
    expect(outputTokensFor(10_000)).toBe(13_000);
    expect(outputTokensFor(1_000_000)).toBe(32_000);
  });

  it("estimates the cost before anything is sent", async () => {
    const { toSend } = await translation.pending(null);
    const estimate = estimateCost(toSend, [], [...Object.keys(BATCH_PRICES), "modele-inconnu"]);
    expect(estimate.articles).toBe(3);
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.dollars["claude-opus-5-5"]).toBeGreaterThan(
      estimate.dollars["claude-haiku-4-5-20251001"] ?? 0,
    );
    expect(estimate.dollars["modele-inconnu"]).toBeNull();
    const listed = (estimate.inputTokens * 2 + estimate.outputTokens * 10) / 1_000_000;
    expect(estimate.dollars["claude-opus-5-5"]).toBeCloseTo(listed * MEASURED_OVERRUN, 10);
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
});
