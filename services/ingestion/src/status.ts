import type { IngestionStatus } from "@bgs/shared-types";
import type { PollResult } from "./watch";

/** What one pass of the watcher produced: a result, or the error that stopped it. */
export type PassOutcome = { result: PollResult } | { error: { code: string } };

/**
 * Next status report after one pass. A pass counts as failed when it could not read
 * the source at all, or when every article it tried failed; a single failing article
 * (e.g. quarantined) does not mean the collection is down.
 */
export function nextIngestionStatus(
  previous: IngestionStatus | null,
  outcome: PassOutcome,
  now: Date,
): IngestionStatus {
  const at = now.toISOString();
  const base = {
    lastSuccessAt: previous?.lastSuccessAt ?? null,
    lastChangeAt: previous?.lastChangeAt ?? null,
    lastDetectionSeconds: previous?.lastDetectionSeconds ?? null,
    consecutiveFailures: previous?.consecutiveFailures ?? 0,
    lastFailure: previous?.lastFailure ?? null,
  };
  if ("error" in outcome) {
    return {
      ...base,
      checkedAt: at,
      consecutiveFailures: base.consecutiveFailures + 1,
      lastFailure: { code: outcome.error.code, at },
    };
  }
  const { outcomes, failures, detectionDelays } = outcome.result;
  const attempted = outcomes.created + outcomes.updated + outcomes.unchanged + failures.length;
  const allFailed = failures.length > 0 && failures.length === attempted;
  const changed = outcomes.created + outcomes.updated > 0;
  const firstFailure = failures[0];
  // A detection time only measures changes made while the watcher was running: a
  // change older than the previous successful pass (catch-up at start) is not one.
  const watchedSeconds =
    base.lastSuccessAt === null ? 0 : (now.getTime() - Date.parse(base.lastSuccessAt)) / 1000;
  const measured = detectionDelays.filter((delay) => delay <= watchedSeconds);
  return {
    checkedAt: at,
    lastSuccessAt: allFailed ? base.lastSuccessAt : at,
    lastChangeAt: changed ? at : base.lastChangeAt,
    lastDetectionSeconds: measured.length > 0 ? Math.max(...measured) : base.lastDetectionSeconds,
    consecutiveFailures: allFailed ? base.consecutiveFailures + 1 : 0,
    lastFailure: firstFailure === undefined ? base.lastFailure : { code: firstFailure.code, at },
  };
}
