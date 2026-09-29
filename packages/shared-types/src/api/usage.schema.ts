import { z } from "zod";
import { isoDateSchema } from "../common/primitives.schema";

/*
 * Anonymous usage statistics (ADM-12, decision of 29/09/2026): aggregated counters
 * only, sent by the app when the person has turned them on (off by default). No
 * identifier of a person or a phone, no position, no date from the phone: the
 * server counts on its own day. Nothing here can single anyone out.
 */

export const usagePlatformSchema = z.enum(["android", "ios", "web"]);

/** Sent at most once a day: "someone was active today", with coarse context. */
export const activeSignalSchema = z.strictObject({
  type: z.literal("active"),
  /** First signal of this calendar week / month from this phone (counts WAU / MAU). */
  firstThisWeek: z.boolean(),
  firstThisMonth: z.boolean(),
  /** The very first signal from this phone (a new user of the statistics). */
  firstEver: z.boolean(),
  /** Back exactly 1, 7 or 30 days after the first signal (retention), else null. */
  returnedAfterDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).nullable(),
  platform: usagePlatformSchema,
  /** Major system version only, e.g. "14". */
  osVersion: z.string().regex(/^\d{1,3}$/),
  appVersion: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}$/),
});

/** An official article opened, or listened to. */
export const contentSignalSchema = z.strictObject({
  type: z.enum(["read", "listen"]),
  articleId: z.uuid(),
});

export const usageSignalSchema = z.discriminatedUnion("type", [
  activeSignalSchema,
  contentSignalSchema,
]);
export type UsageSignal = z.infer<typeof usageSignalSchema>;

export const usageBatchSchema = z.strictObject({
  signals: z.array(usageSignalSchema).min(1).max(20),
});

const countsSchema = z.record(z.string(), z.int().nonnegative());

/** One day of counters, as kept by the API. */
export const usageDaySchema = z.object({
  active: z.int().nonnegative(),
  firstEver: z.int().nonnegative(),
  returned: z.object({
    d1: z.int().nonnegative(),
    d7: z.int().nonnegative(),
    d30: z.int().nonnegative(),
  }),
  platforms: countsSchema,
  osVersions: countsSchema,
  appVersions: countsSchema,
  reads: countsSchema,
  listens: countsSchema,
});
export type UsageDay = z.infer<typeof usageDaySchema>;

export const usageFileSchema = z.object({
  schemaVersion: z.literal(1),
  days: z.record(isoDateSchema, usageDaySchema),
  weeks: z.record(z.string(), z.int().nonnegative()),
  months: z.record(z.string(), z.int().nonnegative()),
});
export type UsageFile = z.infer<typeof usageFileSchema>;

const shareSchema = z.object({ name: z.string(), count: z.int().nonnegative() });
const topContentSchema = z.object({
  articleId: z.string(),
  /** The article's title today (null if it is no longer published). */
  title: z.string().nullable(),
  count: z.int().nonnegative(),
});

/** What the console shows: counts and rates, nothing per person. */
export const usageReportSchema = z.object({
  /** First day with any data (null: nothing yet). */
  since: isoDateSchema.nullable(),
  activeToday: z.int().nonnegative(),
  activeYesterday: z.int().nonnegative(),
  activeThisWeek: z.int().nonnegative(),
  activeThisMonth: z.int().nonnegative(),
  newLast7Days: z.int().nonnegative(),
  newLast30Days: z.int().nonnegative(),
  /** Share of new users back after 1, 7, 30 days (last 30 days); null without data. */
  retention: z.object({
    d1: z.number().min(0).max(1).nullable(),
    d7: z.number().min(0).max(1).nullable(),
    d30: z.number().min(0).max(1).nullable(),
  }),
  /** Last 30 days, oldest first: people active and new each day. */
  days: z.array(z.object({ day: isoDateSchema, active: z.int(), firstEver: z.int() })),
  platforms: z.array(shareSchema),
  osVersions: z.array(shareSchema),
  appVersions: z.array(shareSchema),
  topRead: z.array(topContentSchema),
  topListened: z.array(topContentSchema),
});
export type UsageReport = z.infer<typeof usageReportSchema>;
