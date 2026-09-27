import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";
import {
  placeSchema,
  serviceCategorySchema,
  serviceFactsSchema,
} from "../content/state-service.schema";

/*
 * Public services API (/v1/services). The whole list of verified services travels
 * to the phone, which finds the nearest ones itself: the person's location never
 * leaves the phone (CLAUDE.md §1, personal data). Objects are not strict (additive
 * evolution, see news.schema.ts).
 */

/** A verified state service, as the app shows it. */
export const publicServiceSchema = z.object({
  ...serviceFactsSchema.shape,
  id: z.string().min(1),
  category: serviceCategorySchema,
  /** When a person verified it ("vérifié le …"). */
  verifiedAt: isoDateTimeSchema,
  /** "osm": the app credits OpenStreetMap (ODbL); "manual": typed in the console. */
  origin: z.enum(["osm", "manual"]),
});
export type PublicService = z.infer<typeof publicServiceSchema>;

export const stateServicesResponseSchema = z.object({
  services: z.array(publicServiceSchema),
  /** Cities and towns, to search services when the location is not shared. */
  places: z.array(placeSchema),
});
export type StateServicesResponse = z.infer<typeof stateServicesResponseSchema>;
