/** A failure of one pass: its catalog code and what it concerns (a slug, an address). */
export interface PassFailure {
  code: string;
  ref: string;
}

/** A site read in a pass, with its own failures (none: all went well). */
export interface SiteRead {
  source: string;
  failures: readonly PassFailure[];
}

const key = ({ code, ref }: PassFailure) => `${code} ${ref}`;

/**
 * What the watcher writes about failures: each one when it first appears and when
 * it is gone, plus one line a day while some remain. Until 03/11/2026 every pass
 * wrote them all again: about 30 lines every half hour (4,000 a week), in which a
 * new failure was hard to see. A pass reads one ministry site in turn: a failure is
 * gone only when its own site, read again, no longer reports it.
 */
export class FailureLog {
  private known = new Map<string, { source: string; code: string }>();
  private remindedOn: string | null = null;

  /** The lines to write after a pass (without the time, added by the caller). */
  lines(read: readonly SiteRead[], now: Date): string[] {
    const readSites = new Set(read.map(({ source }) => source));
    const current = new Map(
      read.flatMap(({ source, failures }) =>
        failures.map((failure) => [key(failure), { source, code: failure.code }] as const),
      ),
    );
    const appeared = [...current.keys()].filter((item) => !this.known.has(item));
    const gone = [...this.known]
      .filter(([item, { source }]) => readSites.has(source) && !current.has(item))
      .map(([item]) => item);
    this.known = new Map([
      ...[...this.known].filter(([, { source }]) => !readSites.has(source)),
      ...current,
    ]);
    const day = now.toISOString().slice(0, 10);
    const reminder =
      appeared.length === 0 && this.known.size > 0 && this.remindedOn !== day
        ? [`✗ still failing: ${String(this.known.size)} (${this.codes()})`]
        : [];
    if (appeared.length > 0 || reminder.length > 0) {
      this.remindedOn = day;
    }
    return [
      ...appeared.map((item) => `✗ ${item}`),
      ...gone.map((item) => `✓ no longer failing: ${item}`),
      ...reminder,
    ];
  }

  /** How many of each code, for a reminder that fits on one line. */
  private codes(): string {
    const count = new Map<string, number>();
    for (const { code } of this.known.values()) {
      count.set(code, (count.get(code) ?? 0) + 1);
    }
    return [...count].map(([code, n]) => `${code} ${String(n)}`).join(", ");
  }
}
