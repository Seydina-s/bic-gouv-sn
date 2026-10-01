import { parseCalendarDate, toIsoDay } from "../news/format";

/** Within this many days, the closing date is said as days left. */
export const SOON_DAYS = 7;

export type Closing =
  | { kind: "none" }
  | { kind: "today" }
  | { kind: "soon"; days: number }
  | { kind: "on"; date: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

/** How the closing date reads on `now`: none, today, in a few days, or on a date. */
export function closingOf(deadline: string | null, now: Date): Closing {
  if (deadline === null) {
    return { kind: "none" };
  }
  const end = parseCalendarDate(deadline);
  const days = Math.round((end.getTime() - parseCalendarDate(toIsoDay(now)).getTime()) / DAY_MS);
  if (days <= 0) {
    return { kind: "today" };
  }
  return days <= SOON_DAYS ? { kind: "soon", days } : { kind: "on", date: end };
}
