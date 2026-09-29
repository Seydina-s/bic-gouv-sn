import { activeSignal, EMPTY_MEMORY, readMemory, type Device } from "./usage-signals";

const DEVICE: Device = { platform: "android", osVersion: "14", appVersion: "1.0.0" };
const DAY_MS = 24 * 60 * 60 * 1000;
const MONDAY = Date.parse("2026-09-28T09:00:00Z");

describe("the daily active signal", () => {
  it("is new, first of the week and month, the very first time", () => {
    const result = activeSignal(EMPTY_MEMORY, MONDAY, DEVICE);
    expect(result?.signal).toEqual({
      type: "active",
      firstThisWeek: true,
      firstThisMonth: true,
      firstEver: true,
      returnedAfterDays: null,
      ...DEVICE,
    });
    expect(result?.next).toEqual({
      firstDay: "2026-09-28",
      lastDay: "2026-09-28",
      lastWeek: "2026-W40",
      lastMonth: "2026-09",
    });
  });

  it("is sent once a day, and says when the person came back after one day", () => {
    const first = activeSignal(EMPTY_MEMORY, MONDAY, DEVICE);
    const memory = first?.next ?? EMPTY_MEMORY;
    expect(activeSignal(memory, MONDAY + 3 * 60 * 60 * 1000, DEVICE)).toBeNull();
    const tuesday = activeSignal(memory, MONDAY + DAY_MS, DEVICE);
    expect(tuesday?.signal).toMatchObject({
      firstEver: false,
      firstThisWeek: false,
      firstThisMonth: false,
      returnedAfterDays: 1,
    });
  });

  it("counts a new week and a new month, and retention at 7 and 30 days only", () => {
    const memory = activeSignal(EMPTY_MEMORY, MONDAY, DEVICE)?.next ?? EMPTY_MEMORY;
    expect(activeSignal(memory, MONDAY + 7 * DAY_MS, DEVICE)?.signal).toMatchObject({
      firstThisWeek: true,
      firstThisMonth: true,
      returnedAfterDays: 7,
    });
    expect(activeSignal(memory, MONDAY + 12 * DAY_MS, DEVICE)?.signal).toMatchObject({
      returnedAfterDays: null,
    });
    expect(activeSignal(memory, MONDAY + 30 * DAY_MS, DEVICE)?.signal).toMatchObject({
      returnedAfterDays: 30,
    });
  });

  it("starts again from an empty memory when the saved one is missing or damaged", () => {
    expect(readMemory(null)).toEqual(EMPTY_MEMORY);
    expect(readMemory("{pas du json")).toEqual(EMPTY_MEMORY);
    expect(readMemory('{"firstDay":1}')).toEqual(EMPTY_MEMORY);
  });
});
