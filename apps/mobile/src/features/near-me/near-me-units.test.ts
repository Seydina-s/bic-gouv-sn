import { STATE_SERVICES } from "../../testing/service-fixtures";
import { directionsUrl } from "./directions";
import { formatDistance, matchingPlaces, nearestServices } from "./nearby";

const TOWN = { lat: 14.7, lng: -17.4 };

describe("services near a point", () => {
  it("sorts the services from the nearest, for one kind or all", () => {
    const all = nearestServices(STATE_SERVICES.services, TOWN, null);
    expect(all.map(({ service }) => service.id)).toEqual(["osm-n2", "osm-n3", "osm-n1"]);
    expect(Math.round(all[0]?.meters ?? 0)).toBe(111);
    expect(
      nearestServices(STATE_SERVICES.services, TOWN, "tribunal").map((row) => row.service.id),
    ).toEqual(["osm-n3"]);
    expect(nearestServices(STATE_SERVICES.services, TOWN, null, 1)).toHaveLength(1);
  });

  it.each([
    [4, "10\u00a0m"],
    [111, "110\u00a0m"],
    [850, "850\u00a0m"],
    [3210, "3,2\u00a0km"],
    [12_400, "12\u00a0km"],
  ])("says %d meters as %s", (meters, said) => {
    expect(formatDistance(meters)).toBe(said);
  });

  it("finds a town by its first letters, accents and case ignored, cities first", () => {
    const places = [
      ...STATE_SERVICES.places,
      { id: "osm-n11", name: "Thiès", kind: "city" as const, location: TOWN },
      { id: "osm-n12", name: "Thiadiaye", kind: "town" as const, location: TOWN },
    ];
    expect(matchingPlaces(places, "THIE").map((place) => place.name)).toEqual(["Thiès"]);
    expect(matchingPlaces(places, "thi").map((place) => place.name)).toEqual([
      "Thiès",
      "Thiadiaye",
    ]);
    expect(matchingPlaces(places, "de test").map((place) => place.name)).toEqual([
      "Ville de test",
      "Village de test",
    ]);
    expect(matchingPlaces(places, "  ")).toEqual([]);
  });

  it("opens the phone's own navigation app towards the service", () => {
    expect(directionsUrl(TOWN, "Mairie de test", "android")).toBe(
      "geo:14.7,-17.4?q=14.7,-17.4(Mairie%20de%20test)",
    );
    expect(directionsUrl(TOWN, "Mairie", "ios")).toBe(
      "https://maps.apple.com/?daddr=14.7,-17.4&q=Mairie",
    );
    expect(directionsUrl(TOWN, "Mairie", "web")).toBe(
      "https://www.openstreetmap.org/directions?to=14.7,-17.4",
    );
  });
});
