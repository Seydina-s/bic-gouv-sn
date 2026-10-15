import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileDocument } from "@bgs/content-store";
import {
  entreprendreDetailSchema,
  entreprendreOverviewSchema,
  type EntreprendreDocument,
} from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

// Placeholder words, shaped like the pages collected from der.sn.
const page = (
  slug: "presentation" | "comment-deposer",
  group: "der" | "deposer",
  title: string,
) => ({
  slug,
  group,
  title,
  sourceUrl: `https://www.der.sn/${slug}/`,
  sourceUpdatedAt: null,
  fetchedAt: "2026-10-15T10:00:00.000Z",
  contentHash: "a".repeat(64),
  version: 1,
  bodyHtml: `<h3>Pièces fictives</h3><ul><li>Pièce fictive</li></ul><p>Texte fictif de ${title}.</p>`,
});
const SPACE: EntreprendreDocument = {
  // Kept in any order: served in the space's order.
  pages: [
    page("comment-deposer", "deposer", "Déposer un dossier"),
    page("presentation", "der", "Présentation"),
  ],
  news: [
    {
      title: "Actualité fictive",
      publishedOn: "2026-10-12",
      sourceUrl: "https://www.der.sn/actualite-fictive/",
      excerpt: "Premiers mots fictifs…",
    },
  ],
  newsFetchedAt: "2026-10-15T10:00:00.000Z",
};

let dir: string;
let app: FastifyInstance;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-entreprendre-"));
  await writeFile(join(dir, "entreprendre.json"), JSON.stringify(SPACE));
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    entreprendre: fileDocument(join(dir, "entreprendre.json")),
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

describe("Entreprendre", () => {
  it("lists the DER/FJ's pages in the space's order, with their first words and the news", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/entreprendre" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toContain("public");
    const overview = entreprendreOverviewSchema.parse(response.json());
    expect(overview.pages.map((item) => item.slug)).toEqual(["presentation", "comment-deposer"]);
    expect(overview.pages[0]?.excerpt).toBe("Texte fictif de Présentation.");
    expect(overview.news).toHaveLength(1);
  });

  it("gives one page as blocks, with its official link; not yet collected: 404", async () => {
    const detail = entreprendreDetailSchema.parse(
      (await app.inject({ method: "GET", url: "/v1/entreprendre/comment-deposer" })).json(),
    );
    expect(detail.sourceUrl).toBe("https://www.der.sn/comment-deposer/");
    expect(detail.blocks.map((block) => block.type)).toEqual(["heading", "list", "paragraph"]);
    const missing = await app.inject({ method: "GET", url: "/v1/entreprendre/antennes" });
    expect(missing.statusCode).toBe(404);
    const unknown = await app.inject({ method: "GET", url: "/v1/entreprendre/autre" });
    expect(unknown.statusCode).toBe(400);
  });
});
