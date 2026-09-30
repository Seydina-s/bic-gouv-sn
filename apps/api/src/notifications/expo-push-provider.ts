import { createTranslator, fr } from "@bgs/i18n";
import { withTimeout } from "@bgs/resilience";
import { isQuietHour, type Notification, type PushSubscription } from "@bgs/shared-types";
import type { PushProvider } from "./notifications";
import type { PushSubscriptionStore } from "./push-subscriptions";

/** Expo's push service (free): it relays to Apple and Google. */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Messages per request, Expo's limit. */
const CHUNK = 100;
const TIMEOUT_MS = 10_000;

const t = createTranslator({ lang: "fr", reference: fr, catalog: fr });

interface Ticket {
  status: "ok" | "error";
  details?: { error?: string };
}

export interface ExpoPushOptions {
  subscriptions: PushSubscriptionStore;
  /** Optional Expo access token (push security), from the secret manager. */
  accessToken?: string | undefined;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

/** The subscriptions to reach now: following the section, outside their quiet hours. */
export function recipients(
  subscriptions: readonly PushSubscription[],
  category: string,
  hour: number,
): PushSubscription[] {
  return subscriptions.filter(
    (subscription) =>
      subscription.topics.includes(category) && !isQuietHour(subscription.quietHours, hour),
  );
}

/**
 * Sends an approved notification (two people, ADM-07) to the phones following its
 * section, except those in their quiet hours (nothing is queued for later: the
 * article waits in the app). Tokens Expo reports as no longer registered are
 * forgotten. The official title, and the source, nothing written by hand.
 */
export class ExpoPushProvider implements PushProvider {
  readonly ready = true;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;

  constructor(private readonly options: ExpoPushOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  async send(notification: Notification): Promise<"sent"> {
    const hour = new Date(this.now()).getUTCHours(); // Dakar is on UTC all year.
    const targets = recipients(
      await this.options.subscriptions.following(notification.category),
      notification.category,
      hour,
    );
    const messages = targets.map((subscription) => ({
      to: subscription.token,
      title: notification.title,
      body: t("content.sourceAttribution", { source: "presidence.sn" }),
      data: { articleId: notification.articleId },
      sound: "default",
    }));
    let delivered = 0;
    const gone: string[] = [];
    for (let start = 0; start < messages.length; start += CHUNK) {
      const chunk = messages.slice(start, start + CHUNK);
      try {
        const tickets = await this.post(chunk);
        tickets.forEach((ticket, index) => {
          if (ticket.details?.error === "DeviceNotRegistered") {
            gone.push(chunk[index]?.to ?? "");
          }
        });
        delivered += 1;
      } catch {
        // One failed request does not stop the others.
      }
    }
    if (gone.length > 0) {
      await this.options.subscriptions.remove(gone);
    }
    if (messages.length > 0 && delivered === 0) {
      throw new Error("Expo push service unreachable");
    }
    return "sent";
  }

  private async post(chunk: readonly object[]): Promise<Ticket[]> {
    const response = await withTimeout(
      (signal) =>
        this.fetchImpl(EXPO_PUSH_URL, {
          method: "POST",
          signal,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            ...(this.options.accessToken === undefined
              ? {}
              : { authorization: `Bearer ${this.options.accessToken}` }),
          },
          body: JSON.stringify(chunk),
        }),
      { timeoutMs: TIMEOUT_MS },
    );
    if (!response.ok) {
      throw new Error(`Expo push answered ${String(response.status)}`);
    }
    const body = (await response.json()) as { data?: Ticket[] };
    return body.data ?? [];
  }
}
