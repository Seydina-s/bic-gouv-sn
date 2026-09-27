import type { ImportedService } from "@bgs/content-store";
import { httpsUrlSchema, type GeoPoint, type Place, type ServiceCategory } from "@bgs/shared-types";
import type { OverpassElement } from "./overpass";

/*
 * Reading OpenStreetMap objects as state services. Only what the tags say is kept:
 * nothing is guessed, and a person checks every service before it is shown.
 */

type Tags = Readonly<Record<string, string>>;

/** Préfectures, sous-préfectures and gouvernances (the regional level of the State). */
const PREFECTURE = /\b(?:sous[- ]?)?pr[ée]fecture\b|\bgouvernance\b/i;
const GENDARMERIE = /\bgendarmerie\b|\bbrigade\b/i;
/** "Comissariat" is a spelling found at the source. */
const POLICE = /\bcomm?issariat\b|\bpolice\b/i;
const MINISTRY = /\bminist[èe]re\b/i;
const TOWN_HALL = /\bmairie\b|\bh[ôo]tel de ville\b|\bmayor/i;
const COURT = /\btribunal\b|\bcour d/i;

/** What a name says a service is, whatever its tag ("Commissariat…" tagged as a town hall). */
function byName(name: string): ServiceCategory | null {
  const rules: [RegExp, ServiceCategory][] = [
    [PREFECTURE, "prefecture"],
    [GENDARMERIE, "gendarmerie"],
    [POLICE, "police"],
    [TOWN_HALL, "mairie"],
    [COURT, "tribunal"],
  ];
  return rules.find(([pattern]) => pattern.test(name))?.[1] ?? null;
}

/** Services recognised by their amenity tag, refined by their name. */
const BY_AMENITY: Readonly<Record<string, (name: string) => ServiceCategory>> = {
  courthouse: () => "tribunal",
  police: (name) => (GENDARMERIE.test(name) ? "gendarmerie" : "police"),
  townhall: (name) => byName(name) ?? "mairie",
};

/** The kind of state service an object is, or null when it is none of ours. */
export function categoryOf(tags: Tags): ServiceCategory | null {
  const name = tags["name:fr"] ?? tags["name"] ?? "";
  const byAmenity = BY_AMENITY[tags["amenity"] ?? ""];
  if (byAmenity !== undefined) {
    return byAmenity(name);
  }
  if (tags["office"] !== "government") {
    return null;
  }
  const government = tags["government"];
  if (government === "ministry" || MINISTRY.test(name)) {
    return "ministere";
  }
  if (government === "prefecture") {
    return "prefecture";
  }
  return byName(name) ?? "administration";
}

function pointOf(element: OverpassElement): GeoPoint | null {
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lng: element.lon };
  }
  return element.center === undefined ? null : { lat: element.center.lat, lng: element.center.lon };
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** "12 Avenue X", or the full address when the source writes it in one tag. */
function addressOf(tags: Tags): string | null {
  const street = [tags["addr:housenumber"], tags["addr:street"]]
    .map(nonEmpty)
    .filter((part): part is string => part !== null)
    .join(" ");
  return nonEmpty(street) ?? nonEmpty(tags["addr:full"]);
}

/** A website only when secure (https); an insecure link is left out, never rewritten. */
function websiteOf(tags: Tags): string | null {
  const url = nonEmpty(tags["website"] ?? tags["contact:website"]);
  return url !== null && httpsUrlSchema.safeParse(url).success ? url : null;
}

const ID_PREFIX = { node: "n", way: "w", relation: "r" } as const;

/** An OpenStreetMap object as a state service to review, or null when it is not one. */
export function toImportedService(
  element: OverpassElement,
  fetchedAt: string,
): ImportedService | null {
  const tags = element.tags ?? {};
  const name = nonEmpty(tags["name:fr"] ?? tags["name"]);
  const category = categoryOf(tags);
  const location = pointOf(element);
  if (name === null || category === null || location === null) {
    return null;
  }
  return {
    id: `osm-${ID_PREFIX[element.type]}${String(element.id)}`,
    category,
    name,
    address: addressOf(tags),
    town: nonEmpty(tags["addr:city"]),
    location,
    phone: nonEmpty(tags["phone"] ?? tags["contact:phone"]),
    website: websiteOf(tags),
    openingHours: nonEmpty(tags["opening_hours"]),
    origin: { kind: "osm", osmType: element.type, osmId: element.id, fetchedAt },
  };
}

const PLACE_KINDS = ["city", "town", "suburb", "quarter"] as const;

/** A city, town or district, to search services by place when the location is not shared. */
export function toPlace(element: OverpassElement): Place | null {
  const tags = element.tags ?? {};
  const kind = PLACE_KINDS.find((known) => known === tags["place"]);
  const name = nonEmpty(tags["name:fr"] ?? tags["name"]);
  const location = pointOf(element);
  if (kind === undefined || name === null || location === null) {
    return null;
  }
  return { id: `osm-${ID_PREFIX[element.type]}${String(element.id)}`, name, kind, location };
}
