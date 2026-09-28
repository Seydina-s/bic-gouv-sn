import { areaAround, estimatedMegabytes, placeKey, tileCount } from "./offline-area";

const DAKAR = { lat: 14.6928, lng: -17.4467 };

describe("offline area", () => {
  it("is a square of about 6 km around the place", () => {
    const [west, south, east, north] = areaAround(DAKAR);
    expect((north - south) * 111.32).toBeCloseTo(6, 1);
    // Longitude degrees are shorter near the equator's north: the square stays square.
    expect((east - west) * 111.32 * Math.cos((DAKAR.lat * Math.PI) / 180)).toBeCloseTo(6, 1);
  });

  it("counts the tiles to download, a few hundred for a town's streets", () => {
    const area = areaAround(DAKAR);
    expect(tileCount(area, 15, 15)).toBeGreaterThan(tileCount(area, 12, 12));
    const all = tileCount(area);
    expect(all).toBeGreaterThan(20);
    expect(all).toBeLessThan(400);
    expect(estimatedMegabytes(area)).toBeGreaterThanOrEqual(1);
    expect(estimatedMegabytes(area)).toBeLessThan(20);
  });

  it("names the place to about a hundred metres", () => {
    expect(placeKey(DAKAR)).toBe("14.693,-17.447");
  });
});
