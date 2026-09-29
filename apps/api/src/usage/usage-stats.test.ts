import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UsageSignal } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { UsageStats } from "./usage-stats";
import { FileUsageStore, type UsageStore } from "./usage-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.parse("2026-09-29T10:00:00Z");
const ARTICLE = "00000000-0000-5000-8000-000000000001";

function active(overrides: Partial<Extract<UsageSignal, { type: "active" }>> = {}): UsageSignal {
  return {
    type: "active",
    firstThisWeek: false,
    firstThisMonth: false,
    firstEver: false,
    returnedAfterDays: null,
    platform: "android",
    osVersion: "14",
    appVersion: "1.0.0",
    ...overrides,
  };
}

const newPath = () => join(tmpdir(), "bgs-usage", `${randomUUID()}.json`);
const open = () => new UsageStats(new FileUsageStore(newPath()), () => NOW);
const noTitle = () => Promise.resolve(null);

describe("anonymous usage counters", () => {
  it("counts people active today, this week and this month, from their own signals", async () => {
    const stats = open();
    stats.record([active({ firstThisWeek: true, firstThisMonth: true, firstEver: true })], NOW);
    stats.record([active({ firstThisWeek: true, firstThisMonth: true, platform: "ios" })], NOW);
    stats.record([active()], NOW - DAY_MS);
    const report = await stats.report(noTitle, NOW);
    expect(report).toMatchObject({
      activeToday: 2,
      activeYesterday: 1,
      activeThisWeek: 2,
      activeThisMonth: 2,
      newLast7Days: 1,
    });
    expect(report.platforms).toEqual([
      { name: "android", count: 2 },
      { name: "ios", count: 1 },
    ]);
    expect(report.days).toHaveLength(30);
    expect(report.days.at(-1)).toEqual({ day: "2026-09-29", active: 2, firstEver: 1 });
  });

  it("gives the share of new people back after one day", async () => {
    const stats = open();
    for (let person = 0; person < 4; person += 1) {
      stats.record([active({ firstEver: true })], NOW - DAY_MS);
    }
    stats.record([active({ returnedAfterDays: 1 })], NOW);
    const report = await stats.report(noTitle, NOW);
    expect(report.retention.d1).toBe(0.25);
    expect(report.retention.d7).toBeNull();
  });

  it("ranks the articles read, with their current title", async () => {
    const stats = open();
    stats.record(
      [
        { type: "read", articleId: ARTICLE },
        { type: "read", articleId: ARTICLE },
        { type: "listen", articleId: ARTICLE },
      ],
      NOW,
    );
    const report = await stats.report(() => Promise.resolve("Titre officiel"), NOW);
    expect(report.topRead).toEqual([{ articleId: ARTICLE, title: "Titre officiel", count: 2 }]);
    expect(report.topListened).toEqual([{ articleId: ARTICLE, title: "Titre officiel", count: 1 }]);
  });

  it("keeps a little over a year, saved across restarts", async () => {
    const path = newPath();
    const stats = new UsageStats(new FileUsageStore(path), () => NOW);
    stats.record([active()], NOW - 500 * DAY_MS);
    stats.record([active()], NOW);
    await stats.flush();
    const reopened = new UsageStats(new FileUsageStore(path), () => NOW);
    expect((await reopened.report(noTitle, NOW)).since).toBe("2026-09-29");
  });

  it("show counts not saved yet, and keep them when a save fails", async () => {
    const kept = new FileUsageStore(newPath());
    let failing = true;
    const flaky: UsageStore = {
      add: (delta, oldestDay) =>
        failing ? Promise.reject(new Error("store away")) : kept.add(delta, oldestDay),
      load: (fromDay) => kept.load(fromDay),
    };
    const stats = new UsageStats(flaky, () => NOW);
    stats.record([active()], NOW);
    expect((await stats.report(noTitle, NOW)).activeToday).toBe(1);
    await expect(stats.flush()).rejects.toThrow("store away");
    stats.record([active()], NOW);
    failing = false;
    await stats.flush();
    const reopened = new UsageStats(kept, () => NOW);
    expect((await reopened.report(noTitle, NOW)).activeToday).toBe(2);
  });
});
