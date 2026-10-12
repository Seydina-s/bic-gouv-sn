import { sitesReviewSchema, type SitesReview } from "@bgs/shared-types";
import type { JsonDocument } from "./json-document";

/**
 * The weekly review of the sites the collection cannot read yet (GOV-08): written by
 * the collection, read by the API for the console. Missing or damaged: null.
 */
export async function readSitesReview(document: JsonDocument): Promise<SitesReview | null> {
  try {
    const parsed = sitesReviewSchema.safeParse(await document.read());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function writeSitesReview(document: JsonDocument, review: SitesReview): Promise<void> {
  await document.update(() => ({ next: review, result: undefined }));
}
