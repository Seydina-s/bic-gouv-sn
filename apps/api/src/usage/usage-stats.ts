import {
  calendarDay,
  calendarMonth,
  calendarWeek,
  type UsageReport,
  type UsageSignal,
} from "@bgs/shared-types";
import { PeriodicallySaved } from "../journal/periodically-saved";
import { addTo, addToDay, addUsage, emptyDay, emptyUsage } from "./usage-counts";
import type { UsageStore } from "./usage-store";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Days kept: a little over a year, enough for yearly comparisons. */
const KEPT_DAYS = 400;
/** Rows shown per list in the console. */
const TOP = 10;
const REPORT_DAYS = 30;
/** Days the report reads: its 30 days, and 30 more for the retention after 30 days. */
const REPORT_SPAN_DAYS = REPORT_DAYS + 30;

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
 * week and month. Nothing about who sent them. Counted in memory, then added to
 * the store now and then, never on a request's path: several API instances add
 * up their counts (SCALE-02).
 */
export class UsageStats extends PeriodicallySaved {
  /** Counted here since the last save. */
  private pending = emptyUsage();

  constructor(
    private readonly store: UsageStore,
    private readonly clock: () => number = Date.now,
  ) {
    super();
  }

  record(signals: readonly UsageSignal[], now = this.clock()): void {
    const day = (this.pending.days[calendarDay(now)] ??= emptyDay());
    for (const signal of signals) {
      if (signal.type === "active") {
        day.active += 1;
        if (signal.firstThisWeek) {
          addTo(this.pending.weeks, calendarWeek(now));
        }
        if (signal.firstThisMonth) {
          addTo(this.pending.months, calendarMonth(now));
        }
        if (signal.firstEver) {
          day.firstEver += 1;
        }
        if (signal.returnedAfterDays !== null) {
          day.returned[`d${String(signal.returnedAfterDays)}` as "d1" | "d7" | "d30"] += 1;
        }
        addToDay(day, "platforms", signal.platform);
        addToDay(day, "osVersions", `${signal.platform} ${signal.osVersion}`);
        addToDay(day, "appVersions", signal.appVersion);
      } else {
        addToDay(day, signal.type === "read" ? "reads" : "listens", signal.articleId);
      }
    }
    this.changed();
  }

  /** Adds what was counted here to the store; kept for the next save if it fails. */
  protected async save(): Promise<void> {
    const delta = this.pending;
    this.pending = emptyUsage();
    try {
      await this.store.add(delta, calendarDay(this.clock() - KEPT_DAYS * DAY_MS));
    } catch (error) {
      addUsage(this.pending, delta);
      throw error;
    }
  }

  /** The console's view; `titleOf` names an article (null when no longer published). */
  async report(
    titleOf: (articleId: string) => Promise<string | null>,
    now = this.clock(),
  ): Promise<UsageReport> {
    const kept = await this.store.load(calendarDay(now - REPORT_SPAN_DAYS * DAY_MS));
    const usage = kept.usage;
    addUsage(usage, this.pending);
    const since = [kept.since, ...Object.keys(this.pending.days)]
      .filter((key) => key !== null)
      .sort()[0];
    const day = (offset: number) => usage.days[calendarDay(now - offset * DAY_MS)];
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
    return {
      since: since ?? null,
      activeToday: day(0)?.active ?? 0,
      activeYesterday: day(1)?.active ?? 0,
      activeThisWeek: usage.weeks[calendarWeek(now)] ?? 0,
      activeThisMonth: usage.months[calendarMonth(now)] ?? 0,
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
}
