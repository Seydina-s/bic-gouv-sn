import { sitesReviewSchema, type SitesReview } from "@bgs/shared-types";
import { z } from "zod";
import { readPublicStatus, type PublicStatusOptions } from "./public-status";

const responseSchema = z.object({ review: sitesReviewSchema.nullable() });

/**
 * Last weekly look at the ministry sites the collection cannot read yet (GOV-08).
 * Null when none was made yet, or when it cannot be read.
 */
export async function getSitesReview(options: PublicStatusOptions): Promise<SitesReview | null> {
  return (await readPublicStatus("/v1/status/sites", responseSchema, options))?.review ?? null;
}

/** The sites publishing again: each one can be added to the collection. */
export function sitesPublishingAgain(review: SitesReview | null): number | undefined {
  return review?.sites.filter((site) => site.status === "publishing").length;
}
