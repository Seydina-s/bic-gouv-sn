import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";
import { ErrorJournal, errorCodeOf, UNKNOWN_ROUTE } from "./error-journal";

let dir: string;
let app: FastifyInstance | null = null;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-journal-"));
});

afterEach(async () => {
  await app?.close();
  app = null;
  await rm(dir, { recursive: true, force: true });
});

describe("error journal", () => {
  it("groups identical errors by code and place, latest first, and keeps them", async () => {
    const path = join(dir, "error-journal.json");
    const journal = await ErrorJournal.open(path);
    journal.record("NEWS_NOT_FOUND", "GET /v1/news/:id", "r1", new Date("2026-09-28T01:00:00Z"));
    journal.record("INTERNAL_ERROR", "GET /v1/services", "r2", new Date("2026-09-28T01:05:00Z"));
    journal.record("NEWS_NOT_FOUND", "GET /v1/news/:id", "r3", new Date("2026-09-28T01:10:00Z"));
    expect(journal.entries()).toEqual([
      {
        code: "NEWS_NOT_FOUND",
        where: "GET /v1/news/:id",
        count: 2,
        firstAt: "2026-09-28T01:00:00.000Z",
        lastAt: "2026-09-28T01:10:00.000Z",
        lastRequestId: "r3",
      },
      expect.objectContaining({ code: "INTERNAL_ERROR", count: 1 }),
    ]);
    await journal.close();
    const reopened = await ErrorJournal.open(path);
    expect(reopened.entries()).toEqual(journal.entries());
    expect(JSON.parse(await readFile(path, "utf8"))).toMatchObject({ schemaVersion: 1 });
  });

  it("starts empty from a damaged file, and reads only our JSON error bodies", async () => {
    const journal = await ErrorJournal.open(join(dir, "absent.json"));
    expect(journal.entries()).toEqual([]);
    expect(errorCodeOf('{"code":"RATE_LIMITED","message":"x"}')).toBe("RATE_LIMITED");
    expect(errorCodeOf("<html>")).toBeNull();
    expect(errorCodeOf('{"code":12}')).toBeNull();
    expect(errorCodeOf(Buffer.from("{}"))).toBeNull();
  });

  it("records what the API answers, for the console only, without addresses", async () => {
    const admin = await adminForTests();
    const journal = await ErrorJournal.open(join(dir, "error-journal.json"));
    app = await buildApp({
      config: loadConfig({ LOG_LEVEL: "silent" }),
      version: "1.0.0",
      articles: temporaryStore(),
      admin: admin.admin,
      errorJournal: journal,
    });
    await app.inject({ method: "GET", url: "/v1/news/inconnu?secret=1" });
    await app.inject({ method: "GET", url: "/v1/nothing-here" });
    const read = (token?: string) =>
      app?.inject({
        method: "GET",
        url: "/admin/v1/errors",
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
      });
    expect((await read())?.statusCode).toBe(401);
    const answer = await read(await admin.tokenFor("reviewer"));
    const { entries } = answer?.json<{ entries: { code: string; where: string }[] }>() ?? {
      entries: [],
    };
    expect(entries.map(({ code, where }) => [code, where])).toContainEqual([
      "ROUTE_NOT_FOUND",
      UNKNOWN_ROUTE,
    ]);
    expect(JSON.stringify(entries)).not.toContain("secret");
    expect(JSON.stringify(entries)).not.toContain("nothing-here");
  });
});
