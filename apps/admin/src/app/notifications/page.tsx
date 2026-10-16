import { randomUUID } from "node:crypto";
import {
  notificationsResponseSchema,
  type AutomaticNotifications,
  type Notification,
} from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { BURST_FROM } from "../../lib/attention";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { latestNews } from "../../lib/latest-news";
import { requireAccount } from "../../lib/session";
import { unusualGrowth } from "../../lib/subscriber-growth";
import { AutomaticForm, DecisionForm, MessageForm, PrepareForm } from "./NotificationForms";

export const dynamic = "force-dynamic";

/** What became of an approved notification, in plain words. */
const DELIVERY_WORDING = {
  sent: "notifications.sent",
  "not-sent": "notifications.notSent",
  failed: "notifications.failedSending",
} as const;

/** What became of it, with the number of phones told when known. */
function deliveryLine(delivery: NonNullable<Notification["delivery"]>): string {
  if (delivery.outcome === "sent" && delivery.recipients !== undefined) {
    return delivery.recipients === 0
      ? t("notifications.sentToNobody")
      : t("notifications.sentTo", { count: delivery.recipients });
  }
  return t(DELIVERY_WORDING[delivery.outcome]);
}

function when(iso: string) {
  const at = new Date(iso);
  return { day: formatDay(at), time: formatClockTime(at) };
}

function decisionLine(notification: Notification): string | null {
  if (notification.decidedBy === null || notification.decidedAt === null) {
    return null;
  }
  const decision = t(
    notification.status === "approved"
      ? "notifications.approvedWord"
      : "notifications.cancelledWord",
  );
  return t("notifications.decidedBy", {
    decision,
    name: notification.decidedBy.name,
    ...when(notification.decidedAt),
  });
}

/** A written message's words and photo; nothing more for an article (its title says it). */
function WrittenMessage({ notification }: { notification: Notification }) {
  if (notification.kind !== "message") {
    return null;
  }
  return (
    <>
      <p className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-full bg-accent-container px-3 py-0.5 font-semibold text-on-accent-container">
          {t("notifications.writtenBadge")}
        </span>
        <span className="text-ink-soft">{t("notifications.toEveryone")}</span>
      </p>
      {notification.body !== null && (
        <p className="max-w-prose whitespace-pre-line">{notification.body}</p>
      )}
      {notification.imageKey !== null && (
        // Served by the console's own route, under the person's session.
        <img
          src={`/notifications/photos/${notification.id}`}
          alt={t("notifications.photoAlt")}
          loading="lazy"
          className="max-h-64 w-auto rounded-md border border-line"
        />
      )}
    </>
  );
}

/** Where the automatic notifications stand, in one sentence. */
function automaticLine(automatic: AutomaticNotifications): string {
  if (!automatic.paused) {
    return t("notifications.automaticOn", { perHour: automatic.perHour });
  }
  return t("notifications.automaticPaused", {
    name: automatic.changedBy?.name ?? "—",
    ...(automatic.changedAt === null ? { day: "—", time: "—" } : when(automatic.changedAt)),
  });
}

/** Who and when, for a notification of the history. */
function historyLines(notification: Notification): (string | null)[] {
  if (notification.origin === "automatic") {
    return [t("notifications.automaticSentAt", when(notification.preparedAt))];
  }
  return [
    t("notifications.preparedBy", {
      name: notification.preparedBy.name,
      ...when(notification.preparedAt),
    }),
    decisionLine(notification),
  ];
}

/**
 * Notifications, two people (CLAUDE.md §1): prepare one from an official article,
 * have another person check and send it, and keep the history.
 */
export default async function NotificationsPage() {
  const { token, account } = await requireAccount();
  const [result, articles] = await Promise.all([
    adminRequest({ path: "/notifications", token, schema: notificationsResponseSchema }),
    latestNews(),
  ]);
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {result.status === 403 ? t("review.forbidden") : t("notifications.listFailed")}
      </p>
    );
  }
  const { notifications, canSend, automatic, subscribers } = result.data;
  const pending = notifications.filter((item) => item.status === "pending");
  const decided = notifications.filter((item) => item.status !== "pending");
  const canPrepare = account.role !== "reviewer";
  const growth = unusualGrowth(subscribers);

  return (
    <section aria-labelledby="notifications-title" className="space-y-10">
      <div className="space-y-4">
        <h1
          id="notifications-title"
          className="font-display text-3xl font-extrabold tracking-tight"
        >
          {t("notifications.title")}
        </h1>
        <p className="max-w-prose text-ink-soft">{t("notifications.intro")}</p>
        {!canSend && (
          <p className="max-w-prose rounded-md bg-accent-container px-4 py-3 text-on-accent-container">
            {t("notifications.notYet")}
          </p>
        )}
      </div>

      <section aria-labelledby="automatic-title" className="space-y-4">
        <h2 id="automatic-title" className="font-display text-2xl font-bold">
          {t("notifications.automaticTitle")}
        </h2>
        <p className="max-w-prose">{automaticLine(automatic)}</p>
        {automatic.recentSendings >= BURST_FROM && (
          <p
            role="alert"
            className="max-w-prose rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface"
          >
            {t("notifications.burst", { count: automatic.recentSendings })}
          </p>
        )}
        {automatic.paused && account.role !== "admin" ? (
          <p className="max-w-prose text-sm text-ink-soft">{t("notifications.resumeAdminsOnly")}</p>
        ) : (
          canPrepare && <AutomaticForm paused={automatic.paused} />
        )}
      </section>

      <section aria-labelledby="subscribers-title" className="space-y-2">
        <h2 id="subscribers-title" className="font-display text-2xl font-bold">
          {t("notifications.subscribersTitle")}
        </h2>
        <p className="max-w-prose">
          {t("notifications.subscribers", { count: subscribers.total })}
        </p>
        {growth !== null && (
          <p
            role="alert"
            className="max-w-prose rounded-md bg-danger-surface px-4 py-3 text-on-danger-surface"
          >
            {t("notifications.subscriberGrowth", growth)}
          </p>
        )}
        {subscribers.total > 0 && (
          <p className="max-w-prose text-sm text-ink-soft">
            {t("notifications.subscribersDetail", {
              everySection: subscribers.everySection,
              quietHours: subscribers.quietHours,
              french: subscribers.french,
              wolof: subscribers.wolof,
              english: subscribers.english,
            })}
          </p>
        )}
        <p className="max-w-prose text-sm text-ink-soft">{t("notifications.subscribersNote")}</p>
      </section>

      {canPrepare && (
        <section aria-labelledby="prepare-title" className="space-y-6">
          <h2 id="prepare-title" className="font-display text-2xl font-bold">
            {t("notifications.prepareTitle")}
          </h2>
          <h3 className="font-display text-xl font-bold">{t("notifications.articleTitle")}</h3>
          <PrepareForm
            idempotencyKey={randomUUID()}
            articles={articles.map((article) => ({
              id: article.id,
              label:
                article.publishedOn === null
                  ? article.title
                  : `${formatDay(new Date(article.publishedOn))} · ${article.title}`,
            }))}
          />
          <h3 className="font-display text-xl font-bold">{t("notifications.messageTitle")}</h3>
          <p className="max-w-prose text-ink-soft">{t("notifications.messageIntro")}</p>
          <MessageForm idempotencyKey={randomUUID()} />
        </section>
      )}

      <section aria-labelledby="pending-title" className="space-y-4">
        <h2 id="pending-title" className="font-display text-2xl font-bold">
          {t("notifications.pendingTitle")}
        </h2>
        {pending.length === 0 ? (
          <p className="text-ink-soft">{t("notifications.noPending")}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {pending.map((notification) => {
              const mine = notification.preparedBy.id === account.id;
              return (
                <li key={notification.id} className="space-y-3 p-5">
                  <p className="font-display text-lg font-bold leading-snug">
                    {notification.title}
                  </p>
                  <WrittenMessage notification={notification} />
                  <p className="text-sm text-ink-soft">
                    {t("notifications.preparedBy", {
                      name: notification.preparedBy.name,
                      ...when(notification.preparedAt),
                    })}
                  </p>
                  {mine && <p className="text-sm font-semibold">{t("notifications.yours")}</p>}
                  {canPrepare && <DecisionForm id={notification.id} canApprove={!mine} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="history-title" className="space-y-4">
        <h2 id="history-title" className="font-display text-2xl font-bold">
          {t("notifications.historyTitle")}
        </h2>
        {decided.length === 0 ? (
          <p className="text-ink-soft">{t("notifications.noHistory")}</p>
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {decided.map((notification) => (
              <li key={notification.id} className="space-y-1 p-5">
                <p className="font-semibold leading-snug">{notification.title}</p>
                <WrittenMessage notification={notification} />
                {historyLines(notification).map(
                  (line) =>
                    line !== null && (
                      <p key={line} className="text-sm text-ink-soft">
                        {line}
                      </p>
                    ),
                )}
                {notification.delivery !== null && (
                  <p className="text-sm font-semibold">{deliveryLine(notification.delivery)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
