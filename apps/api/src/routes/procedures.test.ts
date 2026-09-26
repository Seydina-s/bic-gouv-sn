import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileProcedureRepository } from "@bgs/content-store";
import {
  apiErrorSchema,
  procedureDetailSchema,
  procedureListResponseSchema,
  type Procedure,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

// Placeholder texts, not real content.
function procedure(n: number, title: string, bodyHtml: string, overrides: Partial<Procedure> = {}) {
  const sourceUrl = `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/test-${String(n)}`;
  const value: Procedure = {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    kind: "procedure",
    slug: `test-${String(n)}`,
    sourceUrl,
    sourcePublishedOn: null,
    sourceUpdatedAt: null,
    fetchedAt: "2026-09-26T10:00:00Z",
    contentHash: String(n).repeat(64).slice(0, 64),
    version: 1,
    lang: "fr",
    translations: [{ lang: "fr", status: "official", title, bodyHtml, sourceUrl }],
    audio: [],
    embedding: null,
    summary: null,
    costFcfa: null,
    delayDays: null,
    eligibility: null,
    documents: [],
    online: false,
    categories: [],
    offices: [],
    faqs: [],
    legalTexts: [],
    usefulLinks: [],
    related: [],
    ...overrides,
  };
  return value;
}

describe("/v1/procedures", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-procedures-"));
    const procedures = new FileProcedureRepository(join(dir, "procedures.json"));
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
    });
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

  it("says when a procedure does not exist", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/procedures/absente" });
    expect(response.statusCode).toBe(404);
    expect(apiErrorSchema.parse(response.json()).code).toBe("PROCEDURE_NOT_FOUND");
  });
});
