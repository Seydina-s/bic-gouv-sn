import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { correctedFacts, type Place } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileStateServiceStore, type ImportedService } from "./state-service-store";

// Placeholder services and towns, not real data.
const NOW = "2026-09-27T04:00:00Z";
const LATER = "2026-09-28T04:00:00Z";

function service(id: string, overrides: Partial<ImportedService> = {}): ImportedService {
  return {
    id,
    category: "mairie",
    name: `Mairie de test ${id}`,
    address: null,
    town: "Ville de test",
    location: { lat: 14.7, lng: -17.4 },
    phone: null,
    website: null,
    openingHours: null,
    origin: { kind: "osm", osmType: "node", osmId: Number(id.slice(5)), fetchedAt: NOW },
    ...overrides,
  };
}

const TOWN: Place = {
  id: "osm-n900",
  name: "Ville de test",
  kind: "city",
  location: { lat: 14.7, lng: -17.4 },
};

function fail(): never {
  throw new Error("expected a service");
}

let dir: string;
let store: FileStateServiceStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-services-"));
  store = new FileStateServiceStore(join(dir, "state-services.json"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileStateServiceStore", () => {
  it("starts empty", async () => {
    expect(await store.read()).toEqual({ schemaVersion: 1, services: {}, places: [] });
  });

  it("imports services as proposals, never shown until verified", async () => {
    const outcome = await store.importServices([service("osm-n1"), service("osm-n2")], [TOWN]);
    expect(outcome).toEqual({ added: 2, updated: 0, unchanged: 0, changedAfterReview: 0 });
    const file = await store.read();
    expect(file.services["osm-n1"]?.status).toBe("proposed");
    expect(file.places).toEqual([TOWN]);
    expect(await store.verified()).toEqual([]);
  });

  it("shows a service once a person verifies it, and never a rejected one", async () => {
    await store.importServices([service("osm-n1"), service("osm-n2")], []);
    expect(await store.review(["osm-n1", "osm-n404"], "verified", "compte-1", NOW)).toEqual([
      "osm-n1",
    ]);
    await store.review(["osm-n2"], "rejected", "compte-1", NOW);
    const verified = await store.verified();
    expect(verified.map((item) => [item.id, item.reviewedBy, item.reviewedAt])).toEqual([
      ["osm-n1", "compte-1", NOW],
    ]);
  });

  it("lets a proposal follow its source", async () => {
    await store.importServices([service("osm-n1")], []);
    const outcome = await store.importServices(
      [
        service("osm-n1", {
          name: "Nouveau nom",
          origin: { kind: "osm", osmType: "node", osmId: 1, fetchedAt: LATER },
        }),
      ],
      [],
    );
    expect(outcome.updated).toBe(1);
    expect((await store.read()).services["osm-n1"]?.name).toBe("Nouveau nom");
  });

  it("never changes a verified service silently: the change waits for a person", async () => {
    await store.importServices([service("osm-n1")], []);
    await store.review(["osm-n1"], "verified", "compte-1", NOW);
    const moved = service("osm-n1", { location: { lat: 14.8, lng: -17.3 } });
    expect((await store.importServices([moved], [])).changedAfterReview).toBe(1);
    const flagged = (await store.read()).services["osm-n1"];
    expect(flagged?.location).toEqual({ lat: 14.7, lng: -17.4 });
    expect(flagged?.pendingUpdate?.location).toEqual({ lat: 14.8, lng: -17.3 });
    // Verified again after checking: the change is taken.
    await store.review(["osm-n1"], "verified", "compte-2", LATER);
    const checked = (await store.read()).services["osm-n1"];
    expect(checked?.location).toEqual({ lat: 14.8, lng: -17.3 });
    expect(checked?.pendingUpdate).toBeNull();
    expect(checked?.reviewedBy).toBe("compte-2");
  });

  it("keeps a person's corrections whatever a new import brings", async () => {
    await store.importServices([service("osm-n1", { name: "Commissariat de test" })], []);
    const corrected = await store.correct("osm-n1", { category: "police" });
    expect(corrected?.corrections).toEqual({ category: "police" });
    expect(correctedFacts(corrected ?? fail())).toMatchObject({
      category: "police",
      name: "Commissariat de test",
    });
    await store.importServices([service("osm-n1", { name: "Commissariat de test (nouveau)" })], []);
    const again = (await store.read()).services["osm-n1"];
    expect(again?.corrections).toEqual({ category: "police" });
    expect(again === undefined ? null : correctedFacts(again).name).toBe(
      "Commissariat de test (nouveau)",
    );
    // A correction equal to the source is dropped; an unknown service is refused.
    expect((await store.correct("osm-n1", { category: "mairie" }))?.corrections).toEqual({});
    expect(await store.correct("osm-n404", { name: "X" })).toBeNull();
  });

  it("keeps a service moved by a person, even when the source moves it elsewhere", async () => {
    await store.importServices([service("osm-n1")], []);
    const moved = await store.correct("osm-n1", { location: { lat: 14.71, lng: -17.45 } });
    expect(correctedFacts(moved ?? fail()).location).toEqual({ lat: 14.71, lng: -17.45 });
    await store.importServices([service("osm-n1", { location: { lat: 14.9, lng: -17.2 } })], []);
    const again = (await store.read()).services["osm-n1"] ?? fail();
    expect(correctedFacts(again).location).toEqual({ lat: 14.71, lng: -17.45 });
    // Moved back onto the source's point: nothing is left to correct.
    const back = await store.correct("osm-n1", { location: { lat: 14.9, lng: -17.2 } });
    expect(back?.corrections).toEqual({});
  });

  it("keeps the towns when an import brings none, and leaves missing services alone", async () => {
    await store.importServices([service("osm-n1")], [TOWN]);
    const outcome = await store.importServices([], []);
    expect(outcome).toEqual({ added: 0, updated: 0, unchanged: 0, changedAfterReview: 0 });
    const file = await store.read();
    expect(file.places).toEqual([TOWN]);
    expect(Object.keys(file.services)).toEqual(["osm-n1"]);
  });
});
