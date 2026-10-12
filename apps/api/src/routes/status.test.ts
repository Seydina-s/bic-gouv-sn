import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileDocument, writeIngestionStatus, writeSitesReview } from "@bgs/content-store";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { temporaryStore } from "../testing/store";

describe("GET /v1/status/ingestion", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-status-"));
    app = await buildApp({
      config: loadConfig({
        LOG_LEVEL: "silent",
        INGESTION_STATUS_PATH: join(dir, "ingestion-status.json"),
      }),
      version: "1.0.0",
      articles: temporaryStore(),
    });
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("says there is no report before the collection ever ran", async () => {
    const response = await app.inject({ method: "GET", url: "/v1/status/ingestion" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({ report: null });
  });

  it("serves the last report written by the collection", async () => {
    const report = {
      checkedAt: "2026-09-26T10:00:00.000Z",
      lastSuccessAt: "2026-09-26T10:00:00.000Z",
      lastChangeAt: "2026-09-26T09:30:00.000Z",
      lastDetectionSeconds: 42,
      consecutiveFailures: 0,
      lastFailure: null,
    };
    await writeIngestionStatus(fileDocument(join(dir, "ingestion-status.json")), report);
    const response = await app.inject({ method: "GET", url: "/v1/status/ingestion" });
    expect(response.json()).toEqual({ report });
  });
});

describe("GET /v1/status/sites", () => {
  let dir: string;
  let app: FastifyInstance;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "bgs-api-sites-"));
    app = await buildApp({
      config: loadConfig({
        LOG_LEVEL: "silent",
        SITES_REVIEW_PATH: join(dir, "sites-review.json"),
      }),
      version: "1.0.0",
      articles: temporaryStore(),
    });
  });

  afterEach(async () => {
    await app.close();
    await rm(dir, { recursive: true, force: true });
  });

  it("serves the last review of the sites not collected yet, none before the first", async () => {
    expect((await app.inject({ method: "GET", url: "/v1/status/sites" })).json()).toEqual({
      review: null,
    });
    const review = {
      checkedAt: "2026-10-12T03:00:00.000Z",
      sites: [
        {
          name: "Ministère fictif",
          url: "https://www.exemple.gouv.sn/",
          status: "publishing" as const,
          newestDay: "2026-10-02",
        },
      ],
    };
    await writeSitesReview(fileDocument(join(dir, "sites-review.json")), review);
    const response = await app.inject({ method: "GET", url: "/v1/status/sites" });
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.json()).toEqual({ review });
  });
});
