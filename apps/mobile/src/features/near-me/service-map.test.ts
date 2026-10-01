import { STATE_SERVICES } from "../../testing/service-fixtures";
import { AROUND_ZOOM, initialView, mapStyleUrl, servicePoints, touchedPoint } from "./service-map";

const { services } = STATE_SERVICES;
const [first] = services;

function point(properties: Record<string, unknown>, coordinates = [-17.4, 14.7]): GeoJSON.Feature {
  return { type: "Feature", geometry: { type: "Point", coordinates }, properties };
}

describe("service map", () => {
  it("draws each service as a point, longitude first, carrying its id, name and kind", () => {
    const points = servicePoints(services);
    expect(points.features).toHaveLength(services.length);
    expect(points.features[1]).toEqual({
      type: "Feature",
      geometry: { type: "Point", coordinates: [-17.4, 14.701] },
      properties: { id: "osm-n2", name: "Commissariat de test proche", category: "police" },
    });
  });

  it("opens around the chosen place, else over every service, else nowhere", () => {
    expect(initialView({ lat: 14.7, lng: -17.44 }, services)).toEqual({
      center: [-17.44, 14.7],
      zoom: AROUND_ZOOM,
    });
    expect(initialView(null, services)).toEqual({ bounds: [-17.4, 14.701, -17.4, 14.8] });
    expect(first).toBeDefined();
    expect(initialView(null, first === undefined ? [] : [first])).toEqual({
      center: [-17.4, 14.8],
      zoom: AROUND_ZOOM,
    });
    expect(initialView(null, [])).toBeNull();
  });

  it("asks our API for the base map in the app's theme", () => {
    expect(mapStyleUrl("https://api.test", "dark")).toBe(
      "https://api.test/v1/map/style.json?theme=dark",
    );
  });

  it("tells a touched group of services from a single one, and ignores the rest", () => {
    expect(touchedPoint([point({ cluster: true, cluster_id: 7, point_count: 3 })])).toEqual({
      kind: "group",
      groupId: 7,
      center: [-17.4, 14.7],
    });
    expect(touchedPoint([point({ id: "osm-n2", name: "Commissariat" })])).toEqual({
      kind: "service",
      id: "osm-n2",
    });
    expect(touchedPoint([])).toBeNull();
    expect(touchedPoint([point({ name: "sans identifiant" })])).toBeNull();
    expect(
      touchedPoint([
        {
          type: "Feature",
          geometry: { type: "LineString", coordinates: [[-17.4, 14.7]] },
          properties: { id: "osm-n2" },
        },
      ]),
    ).toBeNull();
  });
});
