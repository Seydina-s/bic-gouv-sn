import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { errorJournalEntrySchema, isResolved } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { ErrorJournal } from "../journal/error-journal";
import { FileErrorJournalStore } from "../journal/error-journal-store";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

const journalSchema = z.object({ entries: z.array(errorJournalEntrySchema) });
const NEWS = { code: "INTERNAL_ERROR", where: "GET /v1/news" };

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;
let errorJournal: ErrorJournal;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-errors-"));
  admin = await adminForTests();
  errorJournal = new ErrorJournal(new FileErrorJournalStore(join(dir, "error-journal.json")));
  errorJournal.record(NEWS.code, NEWS.where, "r1", new Date("2026-10-01T04:00:00Z"));
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    admin: admin.admin,
    errorJournal,
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

async function resolve(role: "reviewer" | "editor", target = NEWS) {
  return app.inject({
    method: "POST",
    url: "/admin/v1/errors/resolved",
    headers: { authorization: `Bearer ${await admin.tokenFor(role)}` },
    payload: target,
  });
}

/** The news group (refusals answered meanwhile are journaled too). */
async function newsEntry() {
  const response = await app.inject({
    method: "GET",
    url: "/admin/v1/errors",
    headers: { authorization: `Bearer ${await admin.tokenFor("reviewer")}` },
  });
  return journalSchema
    .parse(response.json())
    .entries.find((entry) => entry.code === NEWS.code && entry.where === NEWS.where);
}

describe("marking an error as fixed", () => {
  it("is for editors: kept with who and when, and written in the audit journal", async () => {
    expect((await resolve("reviewer")).statusCode).toBe(403);
    expect((await resolve("editor")).statusCode).toBe(204);
    const entry = await newsEntry();
    expect(entry?.resolved?.by).toBe("editor");
    expect(entry !== undefined && isResolved(entry)).toBe(true);
    const audit = await admin.admin.journal.entries();
    expect(audit.filter((line) => line.action === "error.resolved")).toMatchObject([
      { target: "INTERNAL_ERROR GET /v1/news" },
    ]);
  });

  it("comes back when the error happens again", async () => {
    await resolve("editor");
    errorJournal.record(NEWS.code, NEWS.where, "r2", new Date(Date.now() + 60_000));
    const entry = await newsEntry();
    expect(entry?.resolved).toBeDefined();
    expect(entry !== undefined && isResolved(entry)).toBe(false);
  });

  it("says plainly when the group is no longer kept, and changes nothing", async () => {
    const response = await resolve("editor", { code: "INTERNAL_ERROR", where: "GET /v1/map" });
    expect(response.statusCode).toBe(404);
    expect(response.json<{ code: string }>().code).toBe("ERROR_GROUP_NOT_FOUND");
    expect((await newsEntry())?.resolved).toBeUndefined();
  });
});
