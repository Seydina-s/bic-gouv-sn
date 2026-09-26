import type { Lang } from "@bgs/shared-types";

/**
 * Dates are formatted in French for both languages until Wolof date words are
 * written by native speakers (W-01): nothing is machine-invented.
 */
const LOCALE: Record<Lang, string> = { fr: "fr-FR", wo: "fr-FR" };

/** "2026-09-24" → a local calendar date (no time zone shift). */
export function parseCalendarDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(year, month - 1, day);
}

/** Local calendar day as "YYYY-MM-DD" (same form as the source's publication day). */
export function toIsoDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatDay(date: Date, lang: Lang): { weekday: string; date: string } {
  const weekday = new Intl.DateTimeFormat(LOCALE[lang], { weekday: "long" }).format(date);
  const rest = new Intl.DateTimeFormat(LOCALE[lang], { day: "numeric", month: "long" }).format(
    date,
  );
  return { weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1), date: rest };
}

export function formatPublishedOn(isoDate: string | null, lang: Lang): string {
  if (isoDate === null) {
    return "";
  }
  return new Intl.DateTimeFormat(LOCALE[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseCalendarDate(isoDate));
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type Freshness = { unit: "now" } | { unit: "minutes" | "hours" | "days"; count: number };

/** How long ago the shown data was fetched, in the largest whole unit. */
export function freshnessOf(updatedAt: number, now: number): Freshness {
  const age = Math.max(0, now - updatedAt);
  if (age < MINUTE) {
    return { unit: "now" };
  }
  if (age < HOUR) {
    return { unit: "minutes", count: Math.floor(age / MINUTE) };
  }
  if (age < DAY) {
    return { unit: "hours", count: Math.floor(age / HOUR) };
  }
  return { unit: "days", count: Math.floor(age / DAY) };
}
