import type { GeoPoint } from "../content/state-service.schema";

const EARTH_RADIUS_METERS = 6_371_008.8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * Distance on the ground between two points, in meters (haversine: accurate to a
 * few meters at the scale of a town, which is what "near me" needs).
 */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The items sorted from the nearest to the farthest, each with its distance. */
export function byDistance<T>(
  from: GeoPoint,
  items: readonly T[],
  pointOf: (item: T) => GeoPoint,
): { item: T; meters: number }[] {
  return items
    .map((item) => ({ item, meters: distanceMeters(from, pointOf(item)) }))
    .sort((a, b) => a.meters - b.meters);
}
