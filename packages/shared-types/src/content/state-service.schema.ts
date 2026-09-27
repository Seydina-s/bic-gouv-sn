import { z } from "zod";
import { httpsUrlSchema, isoDateTimeSchema } from "../common/primitives.schema";

/*
 * State services shown on the map (CLAUDE.md §1, P0). The internal base is filled
 * by an import (OpenStreetMap for a start) and by hand in the console; nothing is
 * shown in the app until a person has verified it ("vérifié le … par …").
 */

/** What kind of state service, to filter the map and give it the right icon. */
export const serviceCategorySchema = z.enum([
  /** Town halls, where civil status (état civil) is kept. */
  "mairie",
  /** Préfectures and sous-préfectures. */
  "prefecture",
  "police",
  "gendarmerie",
  /** Courts (criminal record, nationality certificate…). */
  "tribunal",
  "ministere",
  /** Directions and agencies of the State. */
  "administration",
]);
export type ServiceCategory = z.infer<typeof serviceCategorySchema>;

export const geoPointSchema = z.strictObject({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type GeoPoint = z.infer<typeof geoPointSchema>;

/** Where a service comes from: an OpenStreetMap object, or typed in the console. */
export const serviceOriginSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("osm"),
    osmType: z.enum(["node", "way", "relation"]),
    osmId: z.int().positive(),
    /** Last time the import saw it at the source. */
    fetchedAt: isoDateTimeSchema,
  }),
  z.strictObject({
    kind: z.literal("manual"),
    createdBy: z.string().min(1),
    createdAt: isoDateTimeSchema,
  }),
]);
export type ServiceOrigin = z.infer<typeof serviceOriginSchema>;

/** What a service is and where: what a person checks before it is shown. */
export const serviceFactsSchema = z.strictObject({
  category: serviceCategorySchema,
  name: z.string().min(1),
  address: z.string().nullable(),
  /** Town as written at the source, when given. */
  town: z.string().nullable(),
  location: geoPointSchema,
  phone: z.string().nullable(),
  website: httpsUrlSchema.nullable(),
  /** Opening hours as written at the source (OpenStreetMap syntax), shown verbatim. */
  openingHours: z.string().nullable(),
});
export type ServiceFacts = z.infer<typeof serviceFactsSchema>;

export const stateServiceSchema = serviceFactsSchema.extend({
  /** "osm-n123" (node), "osm-w…" (way), "osm-r…" (relation), or "manual-…". */
  id: z.string().regex(/^(?:osm-[nwr]\d+|manual-[a-z0-9-]+)$/),
  origin: serviceOriginSchema,
  /** "proposed": imported, never shown; "verified": checked by a person, shown; "rejected": never shown. */
  status: z.enum(["proposed", "verified", "rejected"]),
  reviewedBy: z.string().nullable(),
  reviewedAt: isoDateTimeSchema.nullable(),
  /**
   * What the source says now, when it changed after the review. The published facts
   * stay as reviewed (never overwritten silently) until a person checks the change.
   */
  pendingUpdate: serviceFactsSchema.nullable(),
  /**
   * Corrections a person made in the console (a commissariat tagged as a town hall
   * at the source): they win over the source's facts, whatever a new import brings.
   */
  corrections: z
    .strictObject({
      category: serviceCategorySchema.optional(),
      name: z.string().min(1).optional(),
    })
    .default({}),
});
export type StateService = z.infer<typeof stateServiceSchema>;

/** What a service shows: the source's facts, with a person's corrections on top. */
export function correctedFacts(service: StateService): ServiceFacts {
  const { category, name, address, town, location, phone, website, openingHours } = service;
  return {
    category: service.corrections.category ?? category,
    name: service.corrections.name ?? name,
    address,
    town,
    location,
    phone,
    website,
    openingHours,
  };
}

/** A town of the country, to find services when the phone's location is not shared. */
export const placeSchema = z.strictObject({
  id: z.string().regex(/^osm-[nwr]\d+$/),
  name: z.string().min(1),
  kind: z.enum(["city", "town"]),
  location: geoPointSchema,
});
export type Place = z.infer<typeof placeSchema>;

export const stateServicesFileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  /** Keyed by service id. */
  services: z.record(z.string(), stateServiceSchema),
  places: z.array(placeSchema),
});
export type StateServicesFile = z.infer<typeof stateServicesFileSchema>;
