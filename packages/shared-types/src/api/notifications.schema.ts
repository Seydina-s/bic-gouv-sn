import { z } from "zod";
import { isoDateTimeSchema, langSchema, slugSchema } from "../common/primitives.schema";

/*
 * Push notifications. Each one only ever announces an official article, with that
 * article's own title and first words: no free text. Two origins (decision of
 * 30/09/2026): sent automatically for every new article, or prepared in the
 * console and approved by a second person ("validation à deux personnes").
 */

export const notificationStatusSchema = z.enum(["pending", "approved", "cancelled"]);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

const personSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

/** What happened when the approved notification was handed to the push service. */
export const notificationDeliverySchema = z.object({
  /**
   * "sent": handed to the push service; "not-sent": no push service yet;
   * "failed": the push service refused or could not be reached.
   */
  outcome: z.enum(["sent", "not-sent", "failed"]),
  at: isoDateTimeSchema,
  /** Phones it was handed over for (sent only; absent before 30/09/2026). */
  recipients: z.int().nonnegative().optional(),
});

/** "console": two people; "automatic": a new article, sent on its own. */
export const notificationOriginSchema = z.enum(["console", "automatic"]);

export const notificationSchema = z.object({
  id: z.uuid(),
  origin: notificationOriginSchema.default("console"),
  articleId: z.uuid(),
  lang: langSchema,
  /** The article's title, copied from the store when prepared. */
  title: z.string().min(1),
  /** Section of the article: people are notified per section they follow. */
  category: slugSchema,
  status: notificationStatusSchema,
  preparedBy: personSchema,
  preparedAt: isoDateTimeSchema,
  /** The second person who approved or cancelled it. */
  decidedBy: personSchema.nullable(),
  decidedAt: isoDateTimeSchema.nullable(),
  delivery: notificationDeliverySchema.nullable(),
});
export type Notification = z.infer<typeof notificationSchema>;

/** The automatic notification of new articles, as the console shows and changes it. */
export const automaticNotificationsSchema = z.object({
  /** Paused: new articles are not announced (the ones missed are not sent later). */
  paused: z.boolean(),
  /** At most this many automatic notifications per hour: beyond, the next are not announced (they are in the app). */
  perHour: z.int().positive(),
  changedBy: personSchema.nullable(),
  changedAt: isoDateTimeSchema.nullable(),
});
export type AutomaticNotifications = z.infer<typeof automaticNotificationsSchema>;

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  /** False while no push service is set up: approving records, nothing is sent. */
  canSend: z.boolean(),
  automatic: automaticNotificationsSchema,
});

export const setAutomaticNotificationsSchema = z.strictObject({ paused: z.boolean() });

export const prepareNotificationSchema = z.object({
  articleId: z.uuid(),
  lang: langSchema,
});
