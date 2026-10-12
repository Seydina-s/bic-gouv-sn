import type { CircuitStatus } from "@bgs/shared-types";
import { describe, expect, it, vi } from "vitest";
import { getPublishers, sourceRows } from "./sources";

const circuit = (dependency: string, state: CircuitStatus["state"]): CircuitStatus => ({
  dependency,
  state,
  consecutiveFailures: state === "open" ? 5 : 0,
  openedAt: state === "open" ? "2026-10-12T03:00:00.000Z" : null,
});

describe("sourceRows", () => {
  it("names each institution, puts a suspended site first, then the expected order", () => {
    const rows = sourceRows(
      [
        {
          publisher: "sante",
          total: 180,
          newestOn: "2026-09-22",
          lastFetchedAt: "2026-10-11T09:00:00.000Z",
        },
        { publisher: "presidence", total: 978, newestOn: "2026-10-11" },
        { publisher: "agriculture", total: 251, newestOn: null },
        { publisher: "ministere-futur", total: 3 },
      ],
      [
        circuit("presidence.sn", "closed"),
        circuit("www.sante.gouv.sn", "open"),
        circuit("site-inconnu.sn", "open"),
      ],
    );
    expect(rows.map((row) => [row.institution, row.circuit])).toEqual([
      ["sante", "open"],
      ["presidence", "closed"],
      ["agriculture", null],
    ]);
    expect(rows[0]).toMatchObject({
      name: "Ministère de la Santé et de l'Hygiène publique",
      lastFetchedAt: "2026-10-11T09:00:00.000Z",
    });
    expect(rows[1]?.lastFetchedAt).toBeNull();
  });
});

describe("getPublishers", () => {
  it("reads the counts through the API, none when it cannot", async () => {
    const publishers = [{ publisher: "primature", total: 4 }];
    const fetchImpl = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ publishers }))),
    );
    expect(await getPublishers({ apiUrl: "http://api.test", fetchImpl })).toEqual(publishers);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("http://api.test/v1/news/publishers?lang=fr");
    expect(await getPublishers({ apiUrl: null, fetchImpl })).toBeNull();
  });
});
