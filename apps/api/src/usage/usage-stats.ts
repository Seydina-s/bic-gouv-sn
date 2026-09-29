import { readFile } from "node:fs/promises";
import {
  calendarDay,
  calendarMonth,
  calendarWeek,
  usageFileSchema,
  type UsageDay,
  type UsageFile,
  type UsageReport,
  type UsageSignal,
} from "@bgs/shared-types";
import { PeriodicallySaved } from "../journal/periodically-saved";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days kept: a little over a year, enough for yearly comparisons. */
const KEPT_DAYS = 400;
/** Distinct articles counted per day: beyond, new ones are not counted that day. */
const MAX_ARTICLES_PER_DAY = 1000;
/** Rows shown per list in the console. */
const TOP = 10;
const REPORT_DAYS = 30;

function emptyDay(): UsageDay {
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

function add(counts: Record<string, number>, key: string, limit = Infinity): void {
  if (counts[key] === undefined && Object.keys(counts).length >= limit) {
    return;
  }
  counts[key] = (counts[key] ?? 0) + 1;
}

function sumCounts(maps: readonly Record<string, number>[]): [string, number][] {
  const total = new Map<string, number>();
  for (const counts of maps) {
    for (const [key, count] of Object.entries(counts)) {
      total.set(key, (total.get(key) ?? 0) + count);
    }
  }
  return [...total].sort((a, b) => b[1] - a[1]).slice(0, TOP);
}

/**
 * Anonymous usage counters (ADM-12): what the app's signals add up to, per day,
 * week and month. Nothing about who sent them. Kept in memory and written now
 * and then, never on a request's path.
 */
export class UsageStats extends PeriodicallySaved {
  private constructor(
    path: string,
    private readonly data: UsageFile,
  ) {
    super(path);
  }

  /** The counters saved at `path`, or empty ones (missing or unreadable file). */
  static async open(path: string): Promise<UsageStats> {
    let data: UsageFile = { schemaVersion: 1, days: {}, weeks: {}, months: {} };
    try {
      data = usageFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
    } catch {
      // Nothing saved yet, or damaged: the counts start again.
    }
    return new UsageStats(path, data);
  }

  record(signals: readonly UsageSignal[], now = Date.now()): void {
    const key = calendarDay(now);
    const day = (this.data.days[key] ??= emptyDay());
    for (const signal of signals) {
      if (signal.type === "active") {
        day.active += 1;
        if (signal.firstThisWeek) {
          add(this.data.weeks, calendarWeek(now));
        }
        if (signal.firstThisMonth) {
          add(this.data.months, calendarMonth(now));
        }
        if (signal.firstEver) {
          day.firstEver += 1;
        }
        if (signal.returnedAfterDays !== null) {
          day.returned[`d${String(signal.returnedAfterDays)}` as "d1" | "d7" | "d30"] += 1;
        }
        add(day.platforms, signal.platform);
        add(day.osVersions, `${signal.platform} ${signal.osVersion}`);
        add(day.appVersions, signal.appVersion);
      } else {
        add(
          signal.type === "read" ? day.reads : day.listens,
          signal.articleId,
          MAX_ARTICLES_PER_DAY,
        );
      }
    }
    this.forgetOldDays(now);
    this.changed();
  }

  private forgetOldDays(now: number): void {
    const oldest = calendarDay(now - KEPT_DAYS * DAY_MS);
    this.data.days = Object.fromEntries(
      Object.entries(this.data.days).filter(([key]) => key >= oldest),
    );
  }

  /** The console's view; `titleOf` names an article (null when no longer published). */
  async report(
    titleOf: (articleId: string) => Promise<string | null>,
    now = Date.now(),
  ): Promise<UsageReport> {
    const day = (offset: number) => this.data.days[calendarDay(now - offset * DAY_MS)];
    const recent = Array.from({ length: REPORT_DAYS }, (_, index) => REPORT_DAYS - 1 - index);
    const recentDays = recent.map((offset) => day(offset)).filter((item) => item !== undefined);
    const newOver = (days: number) =>
      Array.from({ length: days }, (_, offset) => day(offset)?.firstEver ?? 0).reduce(
        (sum, count) => sum + count,
        0,
      );
    const retention = (after: 1 | 7 | 30) => {
      let back = 0;
      let started = 0;
      for (const offset of recent) {
        back += day(offset)?.returned[`d${String(after)}` as "d1" | "d7" | "d30"] ?? 0;
        started += day(offset + after)?.firstEver ?? 0;
      }
      return started === 0 ? null : Math.min(1, back / started);
    };
    const top = async (counts: Record<string, number>[]) =>
      Promise.all(
        sumCounts(counts).map(async ([articleId, count]) => ({
          articleId,
          title: await titleOf(articleId),
          count,
        })),
      );
    const shares = (counts: Record<string, number>[]) =>
      sumCounts(counts).map(([name, count]) => ({ name, count }));
    const known = Object.keys(this.data.days).sort();
    return {
      since: known[0] ?? null,
      activeToday: day(0)?.active ?? 0,
      activeYesterday: day(1)?.active ?? 0,
      activeThisWeek: this.data.weeks[calendarWeek(now)] ?? 0,
      activeThisMonth: this.data.months[calendarMonth(now)] ?? 0,
      newLast7Days: newOver(7),
      newLast30Days: newOver(30),
      retention: { d1: retention(1), d7: retention(7), d30: retention(30) },
      days: recent.map((offset) => ({
        day: calendarDay(now - offset * DAY_MS),
        active: day(offset)?.active ?? 0,
        firstEver: day(offset)?.firstEver ?? 0,
      })),
      platforms: shares(recentDays.map((item) => item.platforms)),
      osVersions: shares(recentDays.map((item) => item.osVersions)),
      appVersions: shares(recentDays.map((item) => item.appVersions)),
      topRead: await top(recentDays.map((item) => item.reads)),
      topListened: await top(recentDays.map((item) => item.listens)),
    };
  }

  protected snapshot(): UsageFile {
    return this.data;
  }
}
