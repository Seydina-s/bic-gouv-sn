import { describe, expect, it, vi } from "vitest";
import { QuarantineError, SourceUnreachableError } from "../../lib/errors";
import { categoryOf, toImportedService, toPlace } from "./classify";
import { fetchStateServices, type OverpassElement } from "./overpass";

// Placeholder names and places, shaped like OpenStreetMap data; not real services.
const NOW = "2026-09-27T04:00:00Z";

describe("reading OpenStreetMap objects as state services", () => {
  it.each([
    [{ amenity: "courthouse", name: "Tribunal de test" }, "tribunal"],
    [{ amenity: "police", name: "Commissariat de test" }, "police"],
    [{ amenity: "police", name: "Brigade de gendarmerie de test" }, "gendarmerie"],
    [{ amenity: "townhall", name: "Mairie de test" }, "mairie"],
    [{ amenity: "townhall", name: "Sous-préfecture de test" }, "prefecture"],
    [{ office: "government", name: "Ministère de test" }, "ministere"],
    [{ office: "government", government: "prefecture", name: "Bureau de test" }, "prefecture"],
    [{ office: "government", name: "Hôtel de ville de test" }, "mairie"],
    [{ office: "government", name: "Mayor's Office" }, "mairie"],
    [{ office: "government", name: "Gouvernance de test" }, "prefecture"],
    [{ amenity: "townhall", name: "Gouvernance de test" }, "prefecture"],
    [{ office: "government", name: "Brigade de gendarmerie de test" }, "gendarmerie"],
    [{ office: "government", name: "Commissariat de test" }, "police"],
    [{ office: "government", name: "Direction de test" }, "administration"],
    [{ amenity: "school", name: "École de test" }, null],
  ])("files %j as %s", (tags, category) => {
    expect(categoryOf(tags)).toBe(category);
  });

  it("keeps what the tags say: name, address, secure website, phone, hours", () => {
    const element: OverpassElement = {
      type: "way",
      id: 42,
      center: { lat: 14.7, lon: -17.4 },
      tags: {
        amenity: "townhall",
        name: "Town Hall",
        "name:fr": "Mairie de test",
        "addr:housenumber": "12",
        "addr:street": "Avenue de test",
        "addr:city": "Ville de test",
        phone: "+221 00 000 00 00",
        website: "https://www.example.org",
        opening_hours: "Mo-Fr 08:00-17:00",
      },
    };
    expect(toImportedService(element, NOW)).toEqual({
      id: "osm-w42",
      category: "mairie",
      name: "Mairie de test",
      address: "12 Avenue de test",
      town: "Ville de test",
      location: { lat: 14.7, lng: -17.4 },
      phone: "+221 00 000 00 00",
      website: "https://www.example.org",
      openingHours: "Mo-Fr 08:00-17:00",
      origin: { kind: "osm", osmType: "way", osmId: 42, fetchedAt: NOW },
    });
  });

  it("leaves out an insecure website, and objects without a name or a point", () => {
    const base: OverpassElement = {
      type: "node",
      id: 7,
      lat: 14.7,
      lon: -17.4,
      tags: { amenity: "police", name: "Commissariat de test", website: "http://example.org" },
    };
    expect(toImportedService(base, NOW)?.website).toBeNull();
    expect(toImportedService({ ...base, tags: { amenity: "police" } }, NOW)).toBeNull();
    expect(
      toImportedService({ type: "way", id: 8, tags: { amenity: "police", name: "X" } }, NOW),
    ).toBeNull();
  });

  it("reads cities and towns to search by town", () => {
    expect(
      toPlace({
        type: "node",
        id: 9,
        lat: 14.7,
        lon: -17.4,
        tags: { place: "city", name: "Ville de test" },
      }),
    ).toEqual({
      id: "osm-n9",
      name: "Ville de test",
      kind: "city",
      location: { lat: 14.7, lng: -17.4 },
    });
    expect(
      toPlace({ type: "node", id: 10, lat: 1, lon: 1, tags: { place: "village", name: "V" } }),
    ).toBeNull();
  });
});

describe("fetchStateServices", () => {
  it("runs one query and reads the elements", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        new Response(JSON.stringify({ elements: [{ type: "node", id: 1, lat: 1, lon: 2 }] })),
      ),
    );
    await expect(fetchStateServices({ fetchImpl })).resolves.toEqual([
      { type: "node", id: 1, lat: 1, lon: 2 },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const init = fetchImpl.mock.calls[0]?.[1];
    expect(init?.body).toEqual(expect.stringContaining("area%5B%22ISO3166-1%22%3D%22SN%22%5D"));
  });

  it("quarantines an answer of an unexpected shape", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(new Response('{"oops":1}')));
    await expect(fetchStateServices({ fetchImpl })).rejects.toBeInstanceOf(QuarantineError);
  });

  it("does not insist when the server refuses the query", async () => {
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response("bad query", { status: 400 })),
    );
    await expect(fetchStateServices({ fetchImpl })).rejects.toBeInstanceOf(SourceUnreachableError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
