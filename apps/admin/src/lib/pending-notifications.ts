import "server-only";
import { notificationsResponseSchema } from "@bgs/shared-types";
import { cache } from "react";
import { adminRequest } from "./admin-api";

/**
 * Notifications waiting for a second person, shown in the navigation so they are
 * not missed (two-person rule). Once per request; 0 when it cannot be read.
 */
export const pendingNotificationCount = cache(async (token: string): Promise<number> => {
  const result = await adminRequest({
    path: "/notifications",
    token,
    schema: notificationsResponseSchema,
  });
  return result.ok
    ? result.data.notifications.filter((notification) => notification.status === "pending").length
    : 0;
});
