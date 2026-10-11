import { ingestionStatusSchema, type IngestionStatus } from "@bgs/shared-types";
import { z } from "zod";
import { readPublicStatus, type PublicStatusOptions } from "./public-status";

const responseSchema = z.object({ report: ingestionStatusSchema.nullable() });

/**
 * Last report of the news collection, read through the API. Null when there is
 * none yet, or when it cannot be read: this card then says "unknown".
 */
export async function getIngestionReport(
  options: PublicStatusOptions,
): Promise<IngestionStatus | null> {
  return (await readPublicStatus("/v1/status/ingestion", responseSchema, options))?.report ?? null;
}
