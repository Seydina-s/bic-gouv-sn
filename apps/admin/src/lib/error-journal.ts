import {
  describeError,
  isOngoing,
  type ErrorDescription,
  type ErrorJournalEntry,
  type ErrorSeverity,
  type IngestionStatus,
} from "@bgs/shared-types";

/** One line of the console's error journal: what it means, how often, since when. */
export interface JournalRow {
  explanation: ErrorDescription;
  /** Technical place: a route pattern, or the collection. */
  place: string;
  count: number;
  firstAt: Date;
  lastAt: Date;
  ongoing: boolean;
  lastRequestId: string | null;
}

/** The collection runs apart from the API: its last failure joins the journal. */
export const COLLECTION_PLACE = "Collecte automatique (presidence.sn)";

const SEVERITY_ORDER: Record<ErrorSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * The journal as a person reads it (CLAUDE.md §4.5): what still happens first, then
 * the most serious, then the most recent; each error in the catalog's plain words.
 */
export function journalRows(
  entries: readonly ErrorJournalEntry[],
  collection: IngestionStatus | null,
  now: Date,
): JournalRow[] {
  const rows: JournalRow[] = entries.map((entry) => ({
    explanation: describeError(entry.code),
    place: entry.where,
    count: entry.count,
    firstAt: new Date(entry.firstAt),
    lastAt: new Date(entry.lastAt),
    ongoing: isOngoing(entry, now),
    lastRequestId: entry.lastRequestId,
  }));
  const failure = collection?.lastFailure ?? null;
  if (collection !== null && failure !== null) {
    rows.push({
      explanation: describeError(failure.code),
      place: COLLECTION_PLACE,
      count: Math.max(1, collection.consecutiveFailures),
      firstAt: new Date(failure.at),
      lastAt: new Date(failure.at),
      ongoing: collection.consecutiveFailures > 0,
      lastRequestId: null,
    });
  }
  return rows.sort(
    (a, b) =>
      Number(b.ongoing) - Number(a.ongoing) ||
      SEVERITY_ORDER[a.explanation.severity] - SEVERITY_ORDER[b.explanation.severity] ||
      b.lastAt.getTime() - a.lastAt.getTime(),
  );
}
