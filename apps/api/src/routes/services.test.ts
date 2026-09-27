import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firstBrokenEntry } from "@bgs/admin-auth";
import { FileStateServiceStore, type ImportedService } from "@bgs/content-store";
import { stateServicesResponseSchema } from "@bgs/shared-types";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../app";
import { loadConfig } from "../config";
import { adminForTests } from "../testing/admin-session";
import { temporaryStore } from "../testing/store";

// Placeholder services and town, not real data.
const NOW = "2026-09-27T04:00:00Z";

function service(n: number, name: string): ImportedService {
  return {
    id: `osm-n${String(n)}`,
    category: "mairie",
    name,
    address: null,
    town: "Ville de test",
    location: { lat: 14.7, lng: -17.4 },
    phone: null,
    website: null,
    openingHours: null,
    origin: { kind: "osm", osmType: "node", osmId: n, fetchedAt: NOW },
  };
}

let dir: string;
let app: FastifyInstance;
let admin: Awaited<ReturnType<typeof adminForTests>>;
let store: FileStateServiceStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-api-services-"));
  store = new FileStateServiceStore(join(dir, "state-services.json"));
  await store.importServices(
    [service(1, "Mairie de test B"), service(2, "Mairie de test A"), service(3, "Mairie C")],
    [{ id: "osm-n9", name: "Ville de test", kind: "city", location: { lat: 14.7, lng: -17.4 } }],
  );
  admin = await adminForTests();
  app = await buildApp({
    config: loadConfig({ LOG_LEVEL: "silent" }),
    version: "1.0.0",
    articles: temporaryStore(),
    stateServices: store,
    admin: admin.admin,
  });
});

afterEach(async () => {
  await app.close();
  await rm(dir, { recursive: true, force: true });
});

const review = (token: string, decision: string, ids: string[]) =>
  app.inject({
    method: "POST",
    url: "/admin/v1/services/review",
    headers: { authorization: `Bearer ${token}` },
    payload: { decision, ids },
  });

async function publicList() {
  const response = await app.inject({ method: "GET", url: "/v1/services" });
  return { response, body: stateServicesResponseSchema.parse(response.json()) };
}

describe("state services", () => {
  it("shows nothing publicly until a person verifies it, but the towns already", async () => {
    const { body } = await publicList();
    expect(body.services).toEqual([]);
    expect(body.places.map((place) => place.name)).toEqual(["Ville de test"]);
  });

  it("lets an editor verify and reject by batches, journaled; only verified ones are public", async () => {
    const token = await admin.tokenFor("editor");
    const listing = await app.inject({
      method: "GET",
      url: "/admin/v1/services",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(listing.headers["cache-control"]).toBe("no-store");
    expect(
      listing.json<{ services: { id: string; osmUrl: string; nearTown: string }[] }>().services[0],
    ).toMatchObject({
      id: "osm-n3",
      osmUrl: "https://www.openstreetmap.org/node/3",
      nearTown: "Ville de test",
    });

    expect((await review(token, "verified", ["osm-n1", "osm-n2"])).json()).toEqual({ reviewed: 2 });
    expect((await review(token, "rejected", ["osm-n3"])).statusCode).toBe(200);

    const { response, body } = await publicList();
    expect(body.services.map((item) => [item.name, item.origin])).toEqual([
      ["Mairie de test A", "osm"],
      ["Mairie de test B", "osm"],
    ]);
    // The account that verified stays in the console: never in the public answer.
    expect(JSON.stringify(body)).not.toContain("reviewedBy");
    expect(body.services[0]?.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const again = await app.inject({
      method: "GET",
      url: "/v1/services",
      headers: { "if-none-match": String(response.headers.etag) },
    });
    expect(again.statusCode).toBe(304);

    const entries = await admin.journal.entries();
    expect(entries.filter((entry) => entry.action === "service.verified")).toHaveLength(1);
    expect(entries.filter((entry) => entry.action === "service.rejected")).toHaveLength(1);
    expect(firstBrokenEntry(entries)).toBe(-1);
  });

  it("refuses without a session, a reviewer's role, and unknown services", async () => {
    expect((await app.inject({ method: "GET", url: "/admin/v1/services" })).statusCode).toBe(401);
    const reviewer = await admin.tokenFor("reviewer");
    expect((await review(reviewer, "verified", ["osm-n1"])).statusCode).toBe(403);
    const editor = await admin.tokenFor("editor");
    expect((await review(editor, "verified", ["osm-n404"])).statusCode).toBe(400);
    expect((await publicList()).body.services).toEqual([]);
  });
});
