import { ingestionStatusSchema, type IngestionStatus } from "@bgs/shared-types";
import { withTimeout } from "@bgs/resilience";
import { z } from "zod";

const responseSchema = z.object({ report: ingestionStatusSchema.nullable() });

export interface IngestionReportOptions {
  apiUrl: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Last report of the news collection, read through the API. Null when there is
 * none yet, when the API is unreachable or answers something unexpected: the API
 * card already explains an API problem, this one then says "unknown".
 */
export async function getIngestionReport({
  apiUrl,
  fetchImpl = fetch,
  timeoutMs = 3000,
}: IngestionReportOptions): Promise<IngestionStatus | null> {
  if (apiUrl === null) {
    return null;
  }
  try {
    return await withTimeout(
      async (signal) => {
        const response = await fetchImpl(`${apiUrl}/v1/status/ingestion`, {
          signal,
          cache: "no-store",
        });
        const parsed = responseSchema.safeParse(await response.json().catch(() => null));
        return response.ok && parsed.success ? parsed.data.report : null;
      },
      { timeoutMs },
    );
  } catch {
    return null;
  }
}
