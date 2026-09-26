import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/**
 * Report written by the real-time collection after each pass, exposed read-only by
 * the API for the administration console. Times and error codes only: no content,
 * no personal data.
 */
export const ingestionStatusSchema = z.object({
  /** Last pass, successful or not. */
  checkedAt: isoDateTimeSchema,
  /** Last pass that read the source without error. */
  lastSuccessAt: isoDateTimeSchema.nullable(),
  /** Last time a new or edited article was saved. */
  lastChangeAt: isoDateTimeSchema.nullable(),
  /** Seconds between publication at the source and detection, for that change. */
  lastDetectionSeconds: z.number().nonnegative().nullable(),
  consecutiveFailures: z.int().nonnegative(),
  lastFailure: z
    .object({
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
      at: isoDateTimeSchema,
    })
    .nullable(),
});
export type IngestionStatus = z.infer<typeof ingestionStatusSchema>;

/** Collection is considered stopped when no pass happened for this long. */
export const INGESTION_STOPPED_AFTER_MS = 15 * 60_000;
/** Failing passes in a row before the collection is reported as failing. */
export const INGESTION_FAILING_AFTER = 3;

export type IngestionVerdict =
  | { state: "ok" }
  | { state: "unknown" }
  | { state: "stopped"; since: string }
  | { state: "failing"; code: string; since: string };

/**
 * Plain verdict for the console: stopped (no pass for 15 min — the watcher is not
 * running), failing (3 failing passes in a row), ok otherwise. A single failure is
 * not reported: the next pass retries it.
 */
export function assessIngestion(status: IngestionStatus | null, now: Date): IngestionVerdict {
  if (status === null) {
    return { state: "unknown" };
  }
  if (now.getTime() - Date.parse(status.checkedAt) > INGESTION_STOPPED_AFTER_MS) {
    return { state: "stopped", since: status.checkedAt };
  }
  if (status.consecutiveFailures >= INGESTION_FAILING_AFTER && status.lastFailure !== null) {
    return {
      state: "failing",
      code: status.lastFailure.code,
      since: status.lastSuccessAt ?? status.lastFailure.at,
    };
  }
  return { state: "ok" };
}
