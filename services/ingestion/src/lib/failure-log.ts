/** A failure of one pass: its catalog code and what it concerns (a slug, an address). */
export interface PassFailure {
  code: string;
  ref: string;
}

const key = ({ code, ref }: PassFailure) => `${code} ${ref}`;

/**
 * What the watcher writes about failures: each one when it first appears and when
 * it is gone, plus one line a day while some remain. Until 03/11/2026 every pass
 * wrote them all again: about 30 lines every half hour (4,000 a week), in which a
 * new failure was hard to see.
 */
export class FailureLog {
  private known = new Set<string>();
  private remindedOn: string | null = null;

  /** The lines to write after a pass (without the time, added by the caller). */
  lines(failures: readonly PassFailure[], now: Date): string[] {
    const current = new Set(failures.map(key));
    const appeared = [...current].filter((item) => !this.known.has(item));
    const gone = [...this.known].filter((item) => !current.has(item));
    const day = now.toISOString().slice(0, 10);
    const reminder =
      appeared.length === 0 && current.size > 0 && this.remindedOn !== day
        ? [`✗ still failing: ${String(current.size)} (${codes(failures)})`]
        : [];
    if (appeared.length > 0 || reminder.length > 0) {
      this.remindedOn = day;
    }
    this.known = current;
    return [
      ...appeared.map((item) => `✗ ${item}`),
      ...gone.map((item) => `✓ no longer failing: ${item}`),
      ...reminder,
    ];
  }
}

/** How many of each code, for a reminder that fits on one line. */
function codes(failures: readonly PassFailure[]): string {
  const count = new Map<string, number>();
  for (const { code } of failures) {
    count.set(code, (count.get(code) ?? 0) + 1);
  }
  return [...count].map(([code, n]) => `${code} ${String(n)}`).join(", ");
}
