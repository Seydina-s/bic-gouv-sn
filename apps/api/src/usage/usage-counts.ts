import type { UsageDay, UsageFile } from "@bgs/shared-types";

/** Distinct articles counted per day: beyond, new ones are not counted that day. */
export const MAX_ARTICLES_PER_DAY = 1000;

const RETURNS = ["d1", "d7", "d30"] as const;
const COUNT_MAPS = ["platforms", "osVersions", "appVersions", "reads", "listens"] as const;
type CountMap = (typeof COUNT_MAPS)[number];
const WEEK = "weekActive";
const MONTH = "monthActive";

export function emptyUsage(): UsageFile {
  return { schemaVersion: 1, days: {}, weeks: {}, months: {} };
}

export function emptyDay(): UsageDay {
  return {
    active: 0,
    firstEver: 0,
    returned: { d1: 0, d7: 0, d30: 0 },
    platforms: {},
    osVersions: {},
    appVersions: {},
    reads: {},
    listens: {},
  };
}

export function isEmptyUsage(usage: UsageFile): boolean {
  return [usage.days, usage.weeks, usage.months].every((part) => Object.keys(part).length === 0);
}

const limitOf = (map: CountMap) =>
  map === "reads" || map === "listens" ? MAX_ARTICLES_PER_DAY : Infinity;

/** Adds `count` to `counts[key]`; a new key beyond `limit` keys is not counted. */
export function addTo(
  counts: Record<string, number>,
  key: string,
  count = 1,
  limit = Infinity,
): void {
  if (counts[key] === undefined && Object.keys(counts).length >= limit) {
    return;
  }
  counts[key] = (counts[key] ?? 0) + count;
}

/** Adds one count map of a day, within its limit (articles). */
export function addToDay(day: UsageDay, map: CountMap, key: string, count = 1): void {
  addTo(day[map], key, count, limitOf(map));
}

/** Adds every count of `delta` to `target`: counts from several instances add up. */
export function addUsage(target: UsageFile, delta: UsageFile): void {
  for (const [key, day] of Object.entries(delta.days)) {
    const into = (target.days[key] ??= emptyDay());
    into.active += day.active;
    into.firstEver += day.firstEver;
    for (const after of RETURNS) {
      into.returned[after] += day.returned[after];
    }
    for (const map of COUNT_MAPS) {
      for (const [name, count] of Object.entries(day[map])) {
        addToDay(into, map, name, count);
      }
    }
  }
  for (const [key, count] of Object.entries(delta.weeks)) {
    addTo(target.weeks, key, count);
  }
  for (const [key, count] of Object.entries(delta.months)) {
    addTo(target.months, key, count);
  }
}

/** Forgets the days before `oldestDay` ("2025-08-25"); weeks and months stay. */
export function forgetDaysBefore(usage: UsageFile, oldestDay: string): void {
  usage.days = Object.fromEntries(Object.entries(usage.days).filter(([key]) => key >= oldestDay));
}

/** One number of the usage_counts table. */
export interface UsageRow {
  period: string;
  metric: string;
  name: string;
  count: number;
}

/** The measures that are not per day, kept past the days' horizon. */
export const LASTING_METRICS = [WEEK, MONTH] as const;

export function usageToRows(usage: UsageFile): UsageRow[] {
  const rows: UsageRow[] = [];
  const push = (period: string, metric: string, count: number, name = "") => {
    if (count > 0 || metric === "active") {
      rows.push({ period, metric, name, count });
    }
  };
  for (const [period, day] of Object.entries(usage.days)) {
    // "active" is always written, even at 0: it marks the day as known.
    push(period, "active", day.active);
    push(period, "firstEver", day.firstEver);
    for (const after of RETURNS) {
      push(period, `returned.${after}`, day.returned[after]);
    }
    for (const map of COUNT_MAPS) {
      for (const [name, count] of Object.entries(day[map])) {
        push(period, map, count, name);
      }
    }
  }
  for (const [period, count] of Object.entries(usage.weeks)) {
    push(period, WEEK, count);
  }
  for (const [period, count] of Object.entries(usage.months)) {
    push(period, MONTH, count);
  }
  return rows;
}

const isCountMap = (metric: string): metric is CountMap =>
  (COUNT_MAPS as readonly string[]).includes(metric);

/** The counters these rows hold; rows of an unknown measure are left aside. */
export function rowsToUsage(rows: readonly UsageRow[]): UsageFile {
  const usage = emptyUsage();
  const dayOf = (period: string) => (usage.days[period] ??= emptyDay());
  for (const { period, metric, name, count } of rows) {
    if (metric === WEEK) {
      addTo(usage.weeks, period, count);
    } else if (metric === MONTH) {
      addTo(usage.months, period, count);
    } else if (metric === "active" || metric === "firstEver") {
      dayOf(period)[metric] += count;
    } else if (metric.startsWith("returned.")) {
      const after = RETURNS.find((key) => metric === `returned.${key}`);
      if (after !== undefined) {
        dayOf(period).returned[after] += count;
      }
    } else if (isCountMap(metric)) {
      addTo(dayOf(period)[metric], name, count);
    }
  }
  return usage;
}
