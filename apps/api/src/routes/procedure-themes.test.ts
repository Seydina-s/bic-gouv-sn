import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firstBrokenEntry } from "@bgs/admin-auth";
import { FileProcedureRepository, FileProcedureThemeStore } from "@bgs/content-store";
import { procedureListResponseSchema, procedureThemesResponseSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { procedure } from "../testing/procedure-fixture";
import { temporaryStore } from "../testing/store";

const NOW = "2026-09-26T12:00:00Z";
let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-themes-"));
  const procedures = new FileProcedureRepository(join(dir, "procedures.json"));
  await procedures.save(procedure(1, "Permis de conduire", "<p>Texte.</p>"));
  await procedures.save(procedure(2, "Carte grise", "<p>Texte.</p>"));
  await procedures.save(procedure(3, "Prêt", "<p>Texte.</p>"));
  const themes = new FileProcedureThemeStore(join(dir, "procedure-themes.json"));
  await themes.saveThemes([
    { id: "a1", title: "Transports", sourceIcon: "fa-bus-alt", fetchedAt: NOW },
    { id: "b2", title: "Finances", sourceIcon: "fa-wallet", fetchedAt: NOW },
  ]);
  await themes.propose({ "test-1": "a1", "test-2": "a1" }, NOW);
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    procedures,
    procedureThemes: themes,
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function themeCounts() {
  const response = await app.inject({ method: "GET", url: "/v1/procedures/themes" });
  return procedureThemesResponseSchema.parse(response.json()).themes;
}

async function slugsInTheme(theme: string) {
  const response = await app.inject({ method: "GET", url: `/v1/procedures?theme=${theme}` });
  return procedureListResponseSchema
    .parse(response.json())
    .items.map((item) => item.slug)
    .sort();
}

const validate = (token: string, themeId: string, slugs: string[]) =>
  app.inject({
    method: "POST",
    url: "/admin/v1/procedure-themes/validate",
    headers: { authorization: `Bearer ${token}` },
    payload: { themeId, slugs },
  });

describe("procedure themes", () => {
  it("shows the official themes, counting only procedures a person validated", async () => {
    expect(await themeCounts()).toEqual([
      { id: "a1", title: "Transports", icon: "fa-bus-alt", count: 0 },
      { id: "b2", title: "Finances", icon: "fa-wallet", count: 0 },
    ]);
    expect(await slugsInTheme("a1")).toEqual([]);
  });

  it("lets a reviewer see the proposals and validate batches, journaled", async () => {
    const token = await admin.tokenFor("reviewer");
    const review = await app.inject({
      method: "GET",
      url: "/admin/v1/procedure-themes",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(review.headers["cache-control"]).toBe("no-store");
    const statuses = review
      .json<{ procedures: { slug: string; status: string }[] }>()
      .procedures.map((p) => [p.slug, p.status]);
    expect(statuses).toEqual(
      expect.arrayContaining([
        ["test-1", "proposed"],
        ["test-3", "unclassified"],
      ]),
    );

    expect((await validate(token, "a1", ["test-1", "test-2"])).json()).toEqual({ validated: 2 });
    expect((await validate(token, "b2", ["test-3"])).statusCode).toBe(200);

    expect((await themeCounts()).map((theme) => theme.count)).toEqual([2, 1]);
    expect(await slugsInTheme("a1")).toEqual(["test-1", "test-2"]);
    const entries = await admin.journal.entries();
    expect(entries.filter((e) => e.action === "procedure.theme.validated")).toHaveLength(2);
    expect(firstBrokenEntry(entries)).toBe(-1);
  });

  it("refuses without a session, and refuses unknown themes or procedures", async () => {
    const anonymous = await app.inject({ method: "GET", url: "/admin/v1/procedure-themes" });
    expect(anonymous.statusCode).toBe(401);
    const token = await admin.tokenFor("reviewer");
    expect((await validate(token, "zz", ["test-1"])).statusCode).toBe(400);
    expect((await validate(token, "a1", ["inconnue"])).statusCode).toBe(400);
  });
});
