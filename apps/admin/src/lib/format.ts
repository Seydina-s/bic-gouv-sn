import type { AdminFrCatalog, Translate } from "@bgs/i18n";

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Human duration in French, precise enough to read at a glance ("3 h 12 min"). */
export function formatDuration(seconds: number, t: Translate<AdminFrCatalog>): string {
  const total = Math.max(0, Math.floor(seconds));
  if (total < MINUTE) {
    return t("duration.lessThanAMinute");
  }
  if (total < HOUR) {
    return t("duration.minutes", { minutes: Math.floor(total / MINUTE) });
  }
  if (total < DAY) {
    return t("duration.hoursMinutes", {
      hours: Math.floor(total / HOUR),
      minutes: Math.floor((total % HOUR) / MINUTE),
    });
  }
  return t("duration.daysHours", {
    days: Math.floor(total / DAY),
    hours: Math.floor((total % DAY) / HOUR),
  });
}

/** Wall-clock time in Dakar (GMT, no daylight saving), e.g. "14:32". */
export function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat("fr-SN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dakar",
  }).format(date);
}
