import { z } from "zod";
import { isoDateTimeSchema, langSchema, slugSchema } from "../common/primitives.schema";
import { base64PhotoSchema } from "./participation.schema";

/*
 * Push notifications. Most announce an official article, with that article's own
 * title and first words. Two origins (decision of 30/09/2026): sent automatically for
 * every new article, or prepared in the console and approved by a second person
 * ("validation à deux personnes"). Since the owner's request of 14/10/2026, the
 * console may also write a message of its own, with a photo: it is approved by a
 * second person all the same.
 */

/** "article": an official article, in its own words; "message": written in the console. */
export const notificationKindSchema = z.enum(["article", "message"]);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

/** A written message fits a locked screen: a short title, a few lines. */
export const MESSAGE_TITLE_MAX = 65;
export const MESSAGE_BODY_MAX = 240;

/** Our copy of a written message's photo, in the public media folder. */
export const notificationImageKeySchema = z.string().regex(/^notifications\/[0-9a-f-]{36}\.jpg$/);

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
  kind: notificationKindSchema.default("article"),
  /** The article announced; null for a written message. */
  articleId: z.uuid().nullable(),
  lang: langSchema,
  /** The article's title, copied from the store when prepared, or the message's. */
  title: z.string().min(1),
  /** A written message's text; null for an article (its first words are sent). */
  body: z.string().min(1).nullable().default(null),
  /** A written message's photo, when one was chosen. */
  imageKey: notificationImageKeySchema.nullable().default(null),
  /**
   * Section of the article: people are notified per section they follow. Null for a
   * written message: every subscribed phone receives it.
   */
  category: slugSchema.nullable(),
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
  /** Automatic sendings of the last 30 minutes: a sudden run deserves a look. */
  recentSendings: z.int().nonnegative(),
});
export type AutomaticNotifications = z.infer<typeof automaticNotificationsSchema>;

/** Phones subscribed to notifications, as totals only (no token ever leaves the base). */
export const subscribersSummarySchema = z.object({
  total: z.int().nonnegative(),
  /** Following every section (the default). */
  everySection: z.int().nonnegative(),
  /** With quiet hours. */
  quietHours: z.int().nonnegative(),
  french: z.int().nonnegative(),
  wolof: z.int().nonnegative(),
  english: z.int().nonnegative(),
  /** Phones that subscribed in the last 24 hours. */
  newLastDay: z.int().nonnegative(),
  /** Phones that subscribed in the 7 days before those 24 hours (the usual pace). */
  newWeekBefore: z.int().nonnegative(),
});
export type SubscribersSummary = z.infer<typeof subscribersSummarySchema>;

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  /** False while no push service is set up: approving records, nothing is sent. */
  canSend: z.boolean(),
  automatic: automaticNotificationsSchema,
  subscribers: subscribersSummarySchema,
});

export const setAutomaticNotificationsSchema = z.strictObject({ paused: z.boolean() });

export const prepareNotificationSchema = z.object({
  articleId: z.uuid(),
  lang: langSchema,
});

/** A message written in the console, with an optional photo (base64). */
export const prepareMessageNotificationSchema = z.strictObject({
  title: z.string().trim().min(1).max(MESSAGE_TITLE_MAX),
  body: z.string().trim().min(1).max(MESSAGE_BODY_MAX),
  lang: langSchema,
  photo: base64PhotoSchema.nullable(),
});
export type PrepareMessageNotification = z.infer<typeof prepareMessageNotificationSchema>;
