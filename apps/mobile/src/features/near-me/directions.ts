import type { GeoPoint } from "@bgs/shared-types";

/** Google Maps' own app on iPhone (declared in LSApplicationQueriesSchemes). */
const GOOGLE_MAPS_IOS = "comgooglemaps://";

function pointOf(to: GeoPoint): string {
  return `${String(to.lat)},${String(to.lng)}`;
}

/**
 * The route to a point in Google Maps: its app opens on it when installed (Android
 * and iPhone), its web page otherwise. Google Maps picks the way of travel.
 */
export function googleMapsDirectionsUrl(to: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${pointOf(to)}`;
}

/** The same route, straight in Google Maps' app on iPhone. */
export function googleMapsIosUrl(to: GeoPoint): string {
  return `${GOOGLE_MAPS_IOS}?daddr=${pointOf(to)}`;
}

/** The route in Apple Plans, on an iPhone without Google Maps. */
export function appleMapsUrl(to: GeoPoint, name: string): string {
  return `https://maps.apple.com/?daddr=${pointOf(to)}&q=${encodeURIComponent(name)}`;
}

export interface LinkOpener {
  canOpenURL: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<unknown>;
}

/**
 * Draws the route to a service in Google Maps when it is on the phone (decision of
 * 30/09/2026). On an iPhone without it, Apple Plans; elsewhere, Google Maps' page.
 */
export async function openDirections(
  to: GeoPoint,
  name: string,
  os: string,
  links: LinkOpener,
): Promise<void> {
  if (os === "ios") {
    const hasGoogleMaps = await links.canOpenURL(GOOGLE_MAPS_IOS).catch(() => false);
    await links.openURL(hasGoogleMaps ? googleMapsIosUrl(to) : appleMapsUrl(to, name));
    return;
  }
  await links.openURL(googleMapsDirectionsUrl(to));
}
