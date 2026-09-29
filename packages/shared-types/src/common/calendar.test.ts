import { describe, expect, it } from "vitest";
import { calendarDay, calendarMonth, calendarWeek, daysBetween } from "./calendar";

describe("calendar keys", () => {
  it("numbers weeks as ISO 8601 does, the year of their Thursday included", () => {
    expect(calendarWeek(Date.parse("2026-09-29T10:00:00Z"))).toBe("2026-W40");
    expect(calendarWeek(Date.parse("2026-01-01T10:00:00Z"))).toBe("2026-W01");
    expect(calendarWeek(Date.parse("2027-01-01T10:00:00Z"))).toBe("2026-W53");
    expect(calendarWeek(Date.parse("2024-12-30T10:00:00Z"))).toBe("2025-W01");
  });

  it("names days and months, and counts the days between two days", () => {
    const time = Date.parse("2026-09-29T23:59:00Z");
    expect(calendarDay(time)).toBe("2026-09-29");
    expect(calendarMonth(time)).toBe("2026-09");
    expect(daysBetween("2026-09-28", "2026-09-29")).toBe(1);
    expect(daysBetween("2026-08-30", "2026-09-29")).toBe(30);
  });
});
