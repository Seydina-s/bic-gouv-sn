import { fit, PATH_BOX, ROAD, ROAD_LENGTH, STATIONS, undrawnAt } from "./onboarding-path";

describe("the welcome path", () => {
  it("climbs through four stations, one per step", () => {
    expect(STATIONS).toHaveLength(4);
    expect(STATIONS.map((station) => station.y)).toEqual([340, 250, 160, 70]);
    expect(ROAD.startsWith("M110 340 C")).toBe(true);
  });

  it("is drawn up to the station reached, and whole at the last one", () => {
    expect(undrawnAt(0)).toBeCloseTo(ROAD_LENGTH);
    expect(undrawnAt(1)).toBeLessThan(undrawnAt(0));
    expect(undrawnAt(2)).toBeLessThan(undrawnAt(1));
    expect(undrawnAt(3)).toBeCloseTo(0);
    // A smooth road is longer than the straight lines between its stations.
    const straight = STATIONS.slice(1).reduce((sum, station, i) => {
      const previous = STATIONS[i] ?? station;
      return sum + Math.hypot(station.x - previous.x, station.y - previous.y);
    }, 0);
    expect(ROAD_LENGTH).toBeGreaterThan(straight);
  });

  it("fits any screen, centred, without distortion", () => {
    expect(fit(390, 400)).toEqual({ scale: 1, left: 0, top: 0 });
    const small = fit(320, 260);
    expect(small.scale).toBeCloseTo(260 / PATH_BOX.height);
    expect(small.left).toBeGreaterThan(0);
    expect(small.top).toBe(0);
  });
});
