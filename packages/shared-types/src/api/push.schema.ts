import { z } from "zod";
import { langSchema, slugSchema } from "../common/primitives.schema";

/*
 * Push notifications by section (CLAUDE.md §1, FEED-04): opt-in only, with quiet
 * hours. The phone's push token is the only thing tying a subscription to a
 * device; nothing else about the person is sent or kept.
 */

/** The address Expo's push service gives one installation of the app. */
export const expoPushTokenSchema = z
  .string()
  .max(200)
  .regex(/^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,}\]$/);

/** Hours (Dakar time, UTC) during which nothing is sent: from `from` to `to`. */
export const quietHoursSchema = z.strictObject({
  from: z.int().min(0).max(23),
  to: z.int().min(0).max(23),
});
export type QuietHours = z.infer<typeof quietHoursSchema>;

export const pushSubscriptionSchema = z.strictObject({
  token: expoPushTokenSchema,
  /**
   * Sections followed. Null: every section (the default, decision of 30/09/2026);
   * empty: nothing is sent (the subscription is then removed).
   */
  topics: z.array(slugSchema).max(30).nullable(),
  quietHours: quietHoursSchema.nullable(),
  lang: langSchema,
});
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;

export const pushUnsubscribeSchema = z.strictObject({ token: expoPushTokenSchema });

/** True when the subscription follows this section (null: every section). */
export function followsSection(subscription: PushSubscription, category: string): boolean {
  return subscription.topics === null || subscription.topics.includes(category);
}

/** True when the subscription follows no section any more: it is then removed. */
export function followsNothing(subscription: PushSubscription): boolean {
  return subscription.topics !== null && subscription.topics.length === 0;
}

/** True when `hour` (0–23, Dakar time) falls in the quiet hours. */
export function isQuietHour(quiet: QuietHours | null, hour: number): boolean {
  if (quiet === null || quiet.from === quiet.to) {
    return false;
  }
  return quiet.from < quiet.to
    ? hour >= quiet.from && hour < quiet.to
    : hour >= quiet.from || hour < quiet.to;
}
