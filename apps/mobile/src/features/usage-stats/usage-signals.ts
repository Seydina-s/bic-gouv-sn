import {
  calendarDay,
  calendarMonth,
  calendarWeek,
  daysBetween,
  type UsageSignal,
} from "@bgs/shared-types";
import { z } from "zod";

/**
 * What the phone remembers to send each signal once: calendar keys only, never a
 * time of day or an identifier. Erased when the person turns statistics off.
 */
export const usageMemorySchema = z.object({
  firstDay: z.string().nullable(),
  lastDay: z.string().nullable(),
  lastWeek: z.string().nullable(),
  lastMonth: z.string().nullable(),
});
export type UsageMemory = z.infer<typeof usageMemorySchema>;

export const EMPTY_MEMORY: UsageMemory = {
  firstDay: null,
  lastDay: null,
  lastWeek: null,
  lastMonth: null,
};

export interface Device {
  platform: "android" | "ios" | "web";
  osVersion: string;
  appVersion: string;
}

/** A remembered state, or an empty one (missing or damaged). */
export function readMemory(raw: string | null): UsageMemory {
  try {
    return usageMemorySchema.parse(JSON.parse(raw ?? "null"));
  } catch {
    return EMPTY_MEMORY;
  }
}

const RETENTION_DAYS = [1, 7, 30] as const;

/**
 * Today's "active" signal, at most once a day, and the memory to keep. Null when
 * this phone already said it was active today.
 */
export function activeSignal(
  memory: UsageMemory,
  now: number,
  device: Device,
): { signal: UsageSignal; next: UsageMemory } | null {
  const day = calendarDay(now);
  if (memory.lastDay === day) {
    return null;
  }
  const week = calendarWeek(now);
  const month = calendarMonth(now);
  const since = memory.firstDay === null ? 0 : daysBetween(memory.firstDay, day);
  const returnedAfterDays = RETENTION_DAYS.find((days) => days === since) ?? null;
  return {
    signal: {
      type: "active",
      firstThisWeek: memory.lastWeek !== week,
      firstThisMonth: memory.lastMonth !== month,
      firstEver: memory.firstDay === null,
      returnedAfterDays,
      ...device,
    },
    next: { firstDay: memory.firstDay ?? day, lastDay: day, lastWeek: week, lastMonth: month },
  };
}
