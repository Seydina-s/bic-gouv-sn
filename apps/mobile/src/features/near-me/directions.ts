import type { GeoPoint } from "@bgs/shared-types";

/**
 * A link that opens the phone's own navigation app towards a point (CLAUDE.md P0:
 * directions through the phone's app). Android lets the person pick their app
 * (Google Maps, Waze, OsmAnd…); elsewhere, OpenStreetMap's directions.
 */
export function directionsUrl(to: GeoPoint, name: string, os: string): string {
  const point = `${String(to.lat)},${String(to.lng)}`;
  const label = encodeURIComponent(name);
  if (os === "ios") {
    return `https://maps.apple.com/?daddr=${point}&q=${label}`;
  }
  if (os === "android") {
    return `geo:${point}?q=${point}(${label})`;
  }
  return `https://www.openstreetmap.org/directions?to=${point}`;
}
