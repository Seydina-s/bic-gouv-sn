import type { UsageFile } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import {
  addUsage,
  emptyDay,
  emptyUsage,
  forgetDaysBefore,
  MAX_ARTICLES_PER_DAY,
  rowsToUsage,
  usageToRows,
} from "./usage-counts";

function sample(): UsageFile {
  const usage = emptyUsage();
  usage.days["2026-09-29"] = {
    ...emptyDay(),
    active: 3,
    firstEver: 1,
    returned: { d1: 1, d7: 0, d30: 2 },
    platforms: { android: 2, ios: 1 },
    osVersions: { "android 14": 2 },
    appVersions: { "1.0.0": 3 },
    reads: { a: 4 },
    listens: { b: 1 },
  };
  usage.days["2026-09-28"] = emptyDay();
  usage.weeks["2026-W40"] = 3;
  usage.months["2026-09"] = 5;
  return usage;
}

describe("usage counts", () => {
  it("become table rows and back without losing anything, a quiet day included", () => {
    expect(rowsToUsage(usageToRows(sample()))).toEqual(sample());
  });

  it("leave aside rows of a measure they do not know", () => {
    const rows = [
      ...usageToRows(sample()),
      { period: "2026-09-29", metric: "x", name: "", count: 9 },
    ];
    expect(rowsToUsage(rows)).toEqual(sample());
  });

  it("add up, as the counts of two instances do", () => {
    const total = sample();
    addUsage(total, sample());
    expect(total.days["2026-09-29"]?.active).toBe(6);
    expect(total.days["2026-09-29"]?.returned.d30).toBe(4);
    expect(total.days["2026-09-29"]?.platforms).toEqual({ android: 4, ios: 2 });
    expect(total.weeks["2026-W40"]).toBe(6);
    expect(total.months["2026-09"]).toBe(10);
  });

  it("stop counting new articles past the day's maximum", () => {
    const total = emptyUsage();
    const flood = emptyUsage();
    const day = emptyDay();
    for (let index = 0; index <= MAX_ARTICLES_PER_DAY; index += 1) {
      day.reads[`article-${String(index)}`] = 1;
    }
    flood.days["2026-09-29"] = day;
    addUsage(total, flood);
    expect(Object.keys(total.days["2026-09-29"]?.reads ?? {})).toHaveLength(MAX_ARTICLES_PER_DAY);
  });

  it("forget old days but keep weeks and months", () => {
    const usage = sample();
    forgetDaysBefore(usage, "2026-09-29");
    expect(Object.keys(usage.days)).toEqual(["2026-09-29"]);
    expect(usage.weeks["2026-W40"]).toBe(3);
  });
});
