import { z } from "zod";
import { isoDateTimeSchema } from "../common/primitives.schema";

/**
 * One circuit breaker: closed (calls go through), open (calls stopped after repeated
 * failures, until a pause ends) or half-open (one trial call decides).
 */
export const circuitStatusSchema = z.object({
  dependency: z.string().min(1),
  state: z.enum(["closed", "open", "half-open"]),
  consecutiveFailures: z.int().nonnegative(),
  openedAt: isoDateTimeSchema.nullable(),
});
export type CircuitStatus = z.infer<typeof circuitStatusSchema>;

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
  /**
   * When the watcher reads the source again: the planned retry while it fails.
   * Absent from reports written before this field.
   */
  nextAttemptAt: isoDateTimeSchema.nullable().optional(),
  /**
   * The circuit breakers protecting each source (CLAUDE.md §4.5: their state is
   * visible in the console). Absent from reports written before this field.
   */
  circuits: z.array(circuitStatusSchema).optional(),
  /**
   * Recent detection times, newest last, at most DETECTION_HISTORY (CLAUDE.md §1:
   * the "< 2 minutes" objective is measured in the console). Absent before.
   */
  detections: z
    .array(z.object({ at: isoDateTimeSchema, seconds: z.number().nonnegative() }))
    .optional(),
});
export type IngestionStatus = z.infer<typeof ingestionStatusSchema>;

/** CLAUDE.md §1: a new article in the app less than 2 minutes after publication. */
export const DETECTION_TARGET_SECONDS = 120;
/** Detection times kept in the report (enough for a month of publications). */
export const DETECTION_HISTORY = 500;
const DETECTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export interface DetectionObjective {
  /** Articles measured over the last 30 days. */
  count: number;
  /** Share of them available within the target (0 to 1). */
  withinTarget: number;
  /** Half the articles took at most this many seconds. */
  medianSeconds: number;
  /** 95 % of the articles took at most this many seconds. */
  p95Seconds: number;
}

/** Nearest-rank percentile of sorted values (p between 0 and 1). */
function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
}

/** The "< 2 minutes" objective over the last 30 days; null without any measure. */
export function detectionObjective(
  status: IngestionStatus | null,
  now: Date,
): DetectionObjective | null {
  const since = now.getTime() - DETECTION_WINDOW_MS;
  const seconds = (status?.detections ?? [])
    .filter((entry) => Date.parse(entry.at) >= since)
    .map((entry) => entry.seconds)
    .sort((a, b) => a - b);
  if (seconds.length === 0) {
    return null;
  }
  return {
    count: seconds.length,
    withinTarget:
      seconds.filter((value) => value <= DETECTION_TARGET_SECONDS).length / seconds.length,
    medianSeconds: percentile(seconds, 0.5),
    p95Seconds: percentile(seconds, 0.95),
  };
}

/** Collection is considered stopped when no pass happened for this long. */
export const INGESTION_STOPPED_AFTER_MS = 15 * 60_000;
/** Failing passes in a row before the collection is reported as failing. */
export const INGESTION_FAILING_AFTER = 3;

export type IngestionVerdict =
  | { state: "ok" }
  | { state: "unknown" }
  | { state: "stopped"; since: string }
  | { state: "failing"; code: string; since: string; nextAttemptAt: string | null };

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
      nextAttemptAt: status.nextAttemptAt ?? null,
    };
  }
  return { state: "ok" };
}
