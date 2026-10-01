import "server-only";
import { notificationsResponseSchema } from "@bgs/shared-types";
import { cache } from "react";
import type { z } from "zod";
import { adminRequest } from "./admin-api";

export type NotificationsOverview = z.infer<typeof notificationsResponseSchema>;

/**
 * The console's notifications, read once per request: the navigation's counter
 * and the first screen's "À traiter" share it. Null when it cannot be read.
 */
export const notificationsOverview = cache(
  async (token: string): Promise<NotificationsOverview | null> => {
    const result = await adminRequest({
      path: "/notifications",
      token,
      schema: notificationsResponseSchema,
    });
    return result.ok ? result.data : null;
  },
);

/**
 * Notifications waiting for a second person, shown in the navigation so they are
 * not missed (two-person rule). 0 when they cannot be read.
 */
export async function pendingNotificationCount(token: string): Promise<number> {
  const overview = await notificationsOverview(token);
  return overview === null
    ? 0
    : overview.notifications.filter((notification) => notification.status === "pending").length;
}
