import type { GeoPoint } from "@bgs/shared-types";

/** Half the side of the area kept offline around a place, in kilometres. */
export const OFFLINE_RADIUS_KM = 3;
/** From the whole town to its streets; our tiles stop at 15 (the map zooms beyond). */
export const OFFLINE_ZOOMS = { min: 12, max: 15 } as const;
/** Average weight of one compressed tile of a town, measured on Dakar. */
const BYTES_PER_TILE = 40_000;
const KM_PER_DEGREE = 111.32;

export type Bounds = [west: number, south: number, east: number, north: number];

/** The square of `radiusKm` around a point (west, south, east, north). */
export function areaAround({ lat, lng }: GeoPoint, radiusKm = OFFLINE_RADIUS_KM): Bounds {
  const dLat = radiusKm / KM_PER_DEGREE;
  const dLng = radiusKm / (KM_PER_DEGREE * Math.cos((lat * Math.PI) / 180));
  return [lng - dLng, lat - dLat, lng + dLng, lat + dLat];
}

function tileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * 2 ** zoom);
}

function tileY(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom);
}

/** How many map tiles cover the area, from `minZoom` to `maxZoom`. */
export function tileCount(
  [west, south, east, north]: Bounds,
  minZoom: number = OFFLINE_ZOOMS.min,
  maxZoom: number = OFFLINE_ZOOMS.max,
): number {
  let count = 0;
  for (let zoom = minZoom; zoom <= maxZoom; zoom += 1) {
    const columns = tileX(east, zoom) - tileX(west, zoom) + 1;
    const rows = tileY(south, zoom) - tileY(north, zoom) + 1;
    count += columns * rows;
  }
  return count;
}

/** Rough download size of the area, in megabytes (at least 1). */
export function estimatedMegabytes(bounds: Bounds): number {
  return Math.max(1, Math.round((tileCount(bounds) * BYTES_PER_TILE) / 1_000_000));
}

/** One area per place: the key of the place the area was kept for. */
export function placeKey({ lat, lng }: GeoPoint): string {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}
