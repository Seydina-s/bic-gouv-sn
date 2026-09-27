import type { GeoPoint } from "@bgs/shared-types";

// A decimal number, with a dot or a French comma: "14.6928", "14,6928", "-17".
const NUMBER = "(-?\\d{1,3}(?:[.,]\\d+)?)";

/** Coordinates inside the links people copy from a map, the most precise first. */
const LINK_PATTERNS = [
  // Google Maps place: "!3d14.6928!4d-17.4467" (the place itself, not the view).
  new RegExp(`!3d${NUMBER}!4d${NUMBER}`),
  // OpenStreetMap marker: "?mlat=14.6928&mlon=-17.4467".
  new RegExp(`mlat=${NUMBER}&mlon=${NUMBER}`),
  // OpenStreetMap view: "#map=19/14.6928/-17.4467".
  new RegExp(`map=\\d+/${NUMBER}/${NUMBER}`),
  // Google Maps view or search: "/@14.6928,-17.4467,17z", "?q=14.6928,-17.4467".
  new RegExp(`(?:@|[?&](?:q|query|ll)=)${NUMBER},(?:%20|\\+)?${NUMBER}`),
];

/** Two numbers typed by hand: "14.6928, -17.4467", "14,6928 -17,4467", "14.69°; -17.44°". */
const TYPED = new RegExp(`^\\s*${NUMBER}\\s*°?\\s*[,;\\s]\\s*${NUMBER}\\s*°?\\s*$`);

function toNumber(text: string): number {
  return Math.round(Number(text.replace(",", ".")) * 1e6) / 1e6;
}

/**
 * The point in coordinates or in a map link pasted by a person (latitude first, as
 * maps give it). Null when nothing readable is found, or out of the Earth's range.
 */
export function parsePosition(text: string): GeoPoint | null {
  const match =
    LINK_PATTERNS.map((pattern) => pattern.exec(text)).find((found) => found !== null) ??
    TYPED.exec(text);
  const [, lat, lng] = match ?? [];
  if (lat === undefined || lng === undefined) {
    return null;
  }
  const point = { lat: toNumber(lat), lng: toNumber(lng) };
  return Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 ? point : null;
}

/** "14.6928, -17.4467": latitude first, as maps give it, every decimal kept. */
export function positionText({ lat, lng }: GeoPoint): string {
  return `${String(lat)}, ${String(lng)}`;
}

/** The point on openstreetmap.org, with a marker on it. */
export function positionLink({ lat, lng }: GeoPoint): string {
  const [latText, lngText] = [String(lat), String(lng)];
  return `https://www.openstreetmap.org/?mlat=${latText}&mlon=${lngText}#map=18/${latText}/${lngText}`;
}

/** True when both points are the same place (to the millionth of a degree). */
export function samePosition(a: GeoPoint, b: GeoPoint): boolean {
  return a.lat === b.lat && a.lng === b.lng;
}
