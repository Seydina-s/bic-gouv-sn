import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProcedureRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { FileSearchMissStore } from "../journal/search-miss-store";
import { SearchMisses } from "../journal/search-misses";
import { procedure } from "../testing/procedure-fixture";
import { temporaryStore } from "../testing/store";

describe("/v1/procedures", () => {
  let dir: string;
  let app: FastifyInstance;
  let searchMisses: SearchMisses;
  let procedures: FileProcedureRepository;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-procedures-"));
    searchMisses = new SearchMisses(new FileSearchMissStore(join(dir, "search-misses.json")));
    procedures = new FileProcedureRepository(join(dir, "procedures.json"));
    await procedures.save(
      procedure(1, "Extrait de naissance", "<p>Se rendre à la mairie.</p>", {
        costFcfa: 1000,
        delayDays: 2,
        documents: ["Pièce d'identité"],
        faqs: [{ question: "Délai ?", answerHtml: "<p>Deux jours.</p>" }],
      }),
    );
    await procedures.save(procedure(2, "Casier judiciaire", "<p>Au tribunal.</p>"));
    await procedures.save(procedure(3, "Passeport", "<p>Extrait de naissance requis.</p>"));
    app = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent" }),
      version: "1.0.0",
      articles: temporaryStore(),
      procedures,
      searchMisses,
    });
  });

  it("counts a search that found nothing, once per search, not a fruitful one", async () => {
    for (let i = 0; i < 3; i += 1) {
      await app.inject({ method: "GET", url: "/v1/procedures?q=bourse" });
      await app.inject({ method: "GET", url: "/v1/procedures?q=passeport" });
    }
    expect(
      (await searchMisses.shown()).map(({ area, query, count }) => [area, query, count]),
    ).toEqual([["procedures", "bourse", 3]]);
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("lists every procedure alphabetically, page after page", async () => {
    const first = procedureListResponseSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/procedures?limit=2" })).json(),
    );
    expect(first.items.map((item) => item.title)).toEqual([
      "Casier judiciaire",
      "Extrait de naissance",
    ]);
    expect(first.total).toBe(3);
    const next = procedureListResponseSchema.parse(
      (
        await app.inject({
          method: "GET",
          url: `/v1/procedures?limit=2&cursor=${String(first.nextCursor)}`,
        })
      ).json(),
    );
    expect(next.items.map((item) => item.title)).toEqual(["Passeport"]);
    expect(next.nextCursor).toBeNull();
  });

  it("serves numbered pages", async () => {
    const page2 = procedureListResponseSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/procedures?limit=2&page=2" })).json(),
    );
    expect(page2.items.map((item) => item.title)).toEqual(["Passeport"]);
    expect(page2.total).toBe(3);
    expect(page2.nextCursor).toBeNull();
    expect((await app.inject({ method: "GET", url: "/v1/procedures?page=0" })).statusCode).toBe(
      400,
    );
  });

  it("searches, title matches first, accents and case ignored", async () => {
    const found = procedureListResponseSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/procedures?q=EXTRAIT%20naissance" })).json(),
    );
    expect(found.items.map((item) => item.title)).toEqual(["Extrait de naissance", "Passeport"]);
    expect(found.total).toBe(2);
  });

  it("shows one procedure with its facts, blocks and official link", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/procedures/test-1" });
    const detail = procedureDetailSchema.parse(response.json());
    expect(detail).toMatchObject({
      title: "Extrait de naissance",
      costFcfa: 1000,
      delayDays: 2,
      documents: ["Pièce d'identité"],
      sourceUrl: "https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-1",
    });
    expect(detail.blocks).toEqual([
      { type: "paragraph", inlines: [{ text: "Se rendre à la mairie." }] },
    ]);
    expect(detail.faqs[0]?.blocks).toEqual([
      { type: "paragraph", inlines: [{ text: "Deux jours." }] },
    ]);
    const etag = String(response.headers.etag);
    const again = await app.inject({
      method: "GET",
      url: "/v1/procedures/test-1",
      headers: { "if-none-match": etag },
    });
    expect(again.statusCode).toBe(304);
  });

  it("opens a procedure whose official name makes a long address", async () => {
    // Real slugs reach 104 characters: over the server's default limit (100), they
    // were refused (414) and the procedure could not be opened.
    const slug = `${"demander-une-autorisation-".repeat(5)}6918`;
    const procedures = new FileProcedureRepository(join(dir, "procedures.json"));
    await procedures.save(procedure(4, "Autorisation", "<p>Au guichet.</p>", { slug }));
    const response = await app.inject({ method: "GET", url: `/v1/procedures/${slug}` });
    expect(response.statusCode).toBe(200);
    expect(procedureDetailSchema.parse(response.json()).slug).toBe(slug);
  });

  it("says when a procedure does not exist", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/procedures/absente" });
    expect(response.statusCode).toBe(404);
    expect(apiErrorSchema.parse(response.json()).code).toBe("PROCEDURE_NOT_FOUND");
  });

  describe("in the language chosen (ML-14)", () => {
    // Placeholder texts, not real content.
    const sheetFor = (forHash: string) => ({
      status: "machine" as const,
      forHash,
      title: "Birth certificate extract",
      bodyHtml: "<p>Go to the town hall.</p>",
      summary: null,
      eligibility: null,
      documents: ["Identity document"],
      faqs: [{ question: "How long?", answerHtml: "<p>Two days.</p>" }],
    });
    const french = procedure(1, "Extrait de naissance", "<p>Se rendre à la mairie.</p>", {
      costFcfa: 1000,
      delayDays: 2,
      documents: ["Pièce d'identité"],
      faqs: [{ question: "Délai ?", answerHtml: "<p>Deux jours.</p>" }],
    });
    const detail = async (query: string) =>
      procedureDetailSchema.parse(
        (await app.inject({ method: "GET", url: `/v1/procedures/${french.slug}?${query}` })).json(),
      );

    it("shows the translated sheet with fallback=fr, and French to apps that do not ask", async () => {
      await procedures.setLocalized(french.id, "en", sheetFor(french.contentHash));
      expect(await detail("lang=en&fallback=fr")).toMatchObject({
        lang: "en",
        title: "Birth certificate extract",
        documents: ["Identity document"],
        translationStatus: "machine",
      });
      expect(await detail("lang=en")).toMatchObject({ lang: "fr", title: "Extrait de naissance" });
      expect(await detail("lang=wo&fallback=fr")).toMatchObject({ lang: "fr" });
      const list = procedureListResponseSchema.parse(
        (await app.inject({ method: "GET", url: "/v1/procedures?lang=en&fallback=fr" })).json(),
      );
      expect(list.items.find((item) => item.slug === french.slug)?.title).toBe(
        "Birth certificate extract",
      );
    });

    it("no longer shows a translation once the French sheet changed", async () => {
      await procedures.setLocalized(french.id, "en", sheetFor("f".repeat(64)));
      expect(await detail("lang=en&fallback=fr")).toMatchObject({
        lang: "fr",
        title: "Extrait de naissance",
      });
    });
  });
});
