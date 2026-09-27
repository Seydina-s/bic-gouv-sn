import type { GeoPoint, PublicService } from "@bgs/shared-types";

/** Zoom where the streets around a place can be read. */
export const AROUND_ZOOM = 14;

/** Senegal with a margin (west, south, east, north): the area our tiles cover. */
export const SENEGAL_BOUNDS: [number, number, number, number] = [-17.6, 12.2, -11.3, 16.8];

/** Properties a point of the map carries: enough to select its service. */
export interface ServicePointProperties {
  id: string;
  name: string;
}

export type ServicePoints = GeoJSON.FeatureCollection<GeoJSON.Point, ServicePointProperties>;

/** The verified services as points of the map (GeoJSON puts the longitude first). */
export function servicePoints(services: readonly PublicService[]): ServicePoints {
  return {
    type: "FeatureCollection",
    features: services.map((service) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [service.location.lng, service.location.lat] },
      properties: { id: service.id, name: service.name },
    })),
  };
}

export type MapView =
  { center: [number, number]; zoom: number } | { bounds: [number, number, number, number] };

/**
 * Where the map opens: around the chosen place (the person's position or a town),
 * otherwise over every service shown; null when there is nothing to show.
 */
export function initialView(
  origin: GeoPoint | null,
  services: readonly PublicService[],
): MapView | null {
  if (origin !== null) {
    return { center: [origin.lng, origin.lat], zoom: AROUND_ZOOM };
  }
  const [first] = services;
  if (first === undefined) {
    return null;
  }
  let [west, south, east, north] = [
    first.location.lng,
    first.location.lat,
    first.location.lng,
    first.location.lat,
  ];
  for (const { location } of services) {
    west = Math.min(west, location.lng);
    east = Math.max(east, location.lng);
    south = Math.min(south, location.lat);
    north = Math.max(north, location.lat);
  }
  if (west === east && south === north) {
    return { center: [west, south], zoom: AROUND_ZOOM };
  }
  return { bounds: [west, south, east, north] };
}

/** Style of the base map, served by our API in the app's theme (light or dark). */
export function mapStyleUrl(apiBase: string, scheme: "light" | "dark"): string {
  return `${apiBase}/v1/map/style.json?theme=${scheme}`;
}

/** What a touch on the points designates: a group to open, or one service. */
export type PointTouch =
  | { kind: "group"; groupId: number; center: [number, number] }
  | { kind: "service"; id: string }
  | null;

/**
 * Reads the first feature under the finger: a group of nearby services (MapLibre
 * "cluster") or a single service. Anything else is ignored.
 */
export function touchedPoint(features: readonly GeoJSON.Feature[]): PointTouch {
  const [feature] = features;
  if (feature?.geometry.type !== "Point") {
    return null;
  }
  const properties = feature.properties ?? {};
  const cluster: unknown = properties["cluster"];
  const groupId: unknown = properties["cluster_id"];
  const id: unknown = properties["id"];
  const [lng, lat] = feature.geometry.coordinates;
  if (cluster === true && typeof groupId === "number") {
    if (lng === undefined || lat === undefined) {
      return null;
    }
    return { kind: "group", groupId, center: [lng, lat] };
  }
  return typeof id === "string" ? { kind: "service", id } : null;
}
