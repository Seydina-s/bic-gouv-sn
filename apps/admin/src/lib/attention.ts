import {
  describeError,
  isOngoing,
  isResolved,
  type ErrorJournalEntry,
  type notificationsResponseSchema,
} from "@bgs/shared-types";
import type { z } from "zod";
import { t } from "./i18n";
import { unusualGrowth } from "./subscriber-growth";

/** Automatic sendings in 30 minutes from which the console asks for a look. */
export const BURST_FROM = 3;

type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;

/** One thing a person should look at now, and the page where to do it. */
export interface AttentionItem {
  /** Danger: act now. Warning: look when possible. */
  tone: "danger" | "warning";
  text: string;
  href: string;
}

/** A count to look at when there is one: "3 messages à lire". */
function countItem(
  count: number | undefined,
  key: "attention.participation" | "attention.opportunities",
  href: string,
): AttentionItem[] {
  return count === undefined || count === 0
    ? []
    : [{ tone: "warning", text: t(key, { count }), href }];
}

function errorItems(entries: readonly ErrorJournalEntry[], now: Date): AttentionItem[] {
  const open = entries.filter((entry) => isOngoing(entry, now) && !isResolved(entry));
  if (open.length === 0) {
    return [];
  }
  const blocking = open.filter((entry) => describeError(entry.code).severity === "critical");
  const total = t("attention.errorCount", { count: open.length });
  return [
    {
      tone: blocking.length > 0 ? "danger" : "warning",
      text:
        blocking.length > 0
          ? t("attention.errorsBlocking", { count: blocking.length, total })
          : t("attention.errors", { total }),
      href: "/erreurs",
    },
  ];
}

function notificationItems(response: NotificationsResponse): AttentionItem[] {
  const items: AttentionItem[] = [];
  const { automatic, notifications, subscribers } = response;
  if (automatic.recentSendings >= BURST_FROM) {
    items.push({
      tone: "danger",
      text: t("attention.burst", { count: automatic.recentSendings }),
      href: "/notifications",
    });
  }
  const growth = unusualGrowth(subscribers);
  if (growth !== null) {
    items.push({
      tone: "danger",
      text: t("attention.growth", { count: growth.count }),
      href: "/notifications",
    });
  }
  const pending = notifications.filter((item) => item.status === "pending").length;
  if (pending > 0) {
    items.push({
      tone: "warning",
      text: t("attention.pending", { count: pending }),
      href: "/notifications",
    });
  }
  if (automatic.paused) {
    items.push({ tone: "warning", text: t("attention.paused"), href: "/notifications" });
  }
  return items;
}

/**
 * What needs a person now, most urgent first, for the console's first screen: the
 * errors still happening, the notification alerts, what waits for a second person.
 * A source that could not be read says so instead of passing for "nothing to do".
 */
export function attentionItems(input: {
  errors: readonly ErrorJournalEntry[] | null;
  notifications: NotificationsResponse | null;
  now: Date;
  /** Messages and reports of Participer not yet handled (none: unknown, said nothing). */
  participationToRead?: number;
  /** Opportunities waiting for a second person. */
  opportunitiesPending?: number;
}): AttentionItem[] {
  const items = [
    ...(input.errors === null ? [] : errorItems(input.errors, input.now)),
    ...(input.notifications === null ? [] : notificationItems(input.notifications)),
    ...countItem(input.participationToRead, "attention.participation", "/participation"),
    ...countItem(input.opportunitiesPending, "attention.opportunities", "/opportunites"),
  ];
  if (input.errors === null || input.notifications === null) {
    items.push({ tone: "warning", text: t("attention.unreadable"), href: "/" });
  }
  return items.sort((a, b) => Number(b.tone === "danger") - Number(a.tone === "danger"));
}
