import {
  byDistance,
  foldForMatching,
  type GeoPoint,
  type Place,
  type PublicService,
  type ServiceCategory,
} from "@bgs/shared-types";

/** How many services the list shows around a point: the nearest first. */
export const NEARBY_LIMIT = 50;

export interface NearbyService {
  service: PublicService;
  meters: number;
}

/** The services of a category (or all), from the nearest to the farthest. */
export function nearestServices(
  services: readonly PublicService[],
  from: GeoPoint,
  category: ServiceCategory | null,
  limit = NEARBY_LIMIT,
): NearbyService[] {
  const kept = category === null ? services : services.filter((item) => item.category === category);
  return byDistance(from, kept, (service) => service.location)
    .slice(0, limit)
    .map(({ item, meters }) => ({ service: item, meters }));
}

/** "850 m", "3,2 km", "12 km": rounded as people say distances. */
export function formatDistance(meters: number, locale = "fr-FR"): string {
  if (meters < 1000) {
    return `${String(Math.max(10, Math.round(meters / 10) * 10))}\u00a0m`;
  }
  const kilometers = meters / 1000;
  const digits = kilometers < 10 ? 1 : 0;
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(
    kilometers,
  );
  return `${formatted}\u00a0km`;
}

/** Letters only, lower case, no accents: "Thiès" is found by "thies". */
function folded(text: string): string {
  return foldForMatching(text)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Towns whose name starts with, then contains, what was typed; cities first. */
export function matchingPlaces(places: readonly Place[], typed: string, limit = 8): Place[] {
  const query = folded(typed);
  if (query === "") {
    return [];
  }
  const scored = places
    .map((place) => {
      const name = folded(place.name);
      const rank = name.startsWith(query) ? 0 : name.includes(query) ? 1 : 2;
      return { place, rank };
    })
    .filter(({ rank }) => rank < 2)
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        Number(b.place.kind === "city") - Number(a.place.kind === "city") ||
        a.place.name.localeCompare(b.place.name, "fr"),
    );
  return scored.slice(0, limit).map(({ place }) => place);
}
