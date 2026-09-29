const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-09-29" (UTC, which is Dakar's time). */
export function calendarDay(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** "2026-09" (UTC). */
export function calendarMonth(time: number): string {
  return new Date(time).toISOString().slice(0, 7);
}

/** ISO 8601 week, e.g. "2026-W40": weeks start on Monday, the year is its Thursday's. */
export function calendarWeek(time: number): string {
  const date = new Date(time);
  const weekday = (date.getUTCDay() + 6) % 7; // Monday 0 … Sunday 6
  const thursday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - weekday + 3),
  );
  const year = thursday.getUTCFullYear();
  const january4 = new Date(Date.UTC(year, 0, 4));
  const week =
    1 +
    Math.round(
      ((thursday.getTime() - january4.getTime()) / DAY_MS - 3 + ((january4.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${String(year)}-W${String(week).padStart(2, "0")}`;
}

/** Whole days from one calendar day to another ("2026-09-28" → "2026-09-29": 1). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}
