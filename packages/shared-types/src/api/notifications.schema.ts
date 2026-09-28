import { z } from "zod";
import { isoDateTimeSchema, langSchema, slugSchema } from "../common/primitives.schema";

/*
 * Push notifications prepared in the console (CLAUDE.md §1: "validation à deux
 * personnes pour tout envoi national"). A notification only ever announces an
 * official article, with that article's own title: no free text.
 */

export const notificationStatusSchema = z.enum(["pending", "approved", "cancelled"]);
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;

const personSchema = z.object({ id: z.string().min(1), name: z.string().min(1) });

/** What happened when the approved notification was handed to the push service. */
export const notificationDeliverySchema = z.object({
  /** "sent": handed to the push service; "not-sent": no push service yet. */
  outcome: z.enum(["sent", "not-sent"]),
  at: isoDateTimeSchema,
});

export const notificationSchema = z.object({
  id: z.uuid(),
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

export const notificationsResponseSchema = z.object({
  notifications: z.array(notificationSchema),
  /** False while no push service is set up: approving records, nothing is sent. */
  canSend: z.boolean(),
});

export const prepareNotificationSchema = z.object({
  articleId: z.uuid(),
  lang: langSchema,
});
