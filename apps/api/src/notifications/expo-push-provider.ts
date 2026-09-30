import { createTranslator, fr } from "@bgs/i18n";
import { retry, sleep, withTimeout } from "@bgs/resilience";
import { followsSection, isQuietHour, type PushSubscription } from "@bgs/shared-types";
import type { PushProvider, PushResult } from "./notifications";
import { type PushMessage, versionFor } from "./push-message";
import type { PushSubscriptionStore } from "./push-subscriptions";

/** Expo's push service (free): it relays to Apple and Google. */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Messages per request, Expo's limit. */
const CHUNK = 100;
/** Expo accepts 600 notifications a second per project: 6 requests of 100. */
const CHUNKS_PER_SECOND = 6;
/** Waits before trying again a request Expo refused for going too fast. */
const RATE_RETRY = { maxAttempts: 5, baseDelayMs: 1_000, maxDelayMs: 30_000 } as const;

/** Expo refused the request for going too fast: nothing was sent, trying again is safe. */
class RateLimitedError extends Error {}
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
  /** Requests a second at most (Expo's limit); lower or higher in tests only. */
  chunksPerSecond?: number;
  /** First wait after a "too fast" answer, then doubled (with jitter). */
  retryBaseDelayMs?: number;
}

/** The subscriptions to reach now: following the section, outside their quiet hours. */
export function recipients(
  subscriptions: readonly PushSubscription[],
  category: string,
  hour: number,
): PushSubscription[] {
  return subscriptions.filter(
    (subscription) =>
      followsSection(subscription, category) && !isQuietHour(subscription.quietHours, hour),
  );
}

/** One phone's message: the title, the first words, the source, and the cover. */
function expoMessage(
  token: string,
  message: PushMessage,
  version: { title: string; excerpt: string },
) {
  const source = t("content.sourceAttribution", { source: "presidence.sn" });
  return {
    to: token,
    title: version.title,
    body: version.excerpt === "" ? source : `${version.excerpt}\n${source}`,
    data: { articleId: message.articleId },
    sound: "default",
    // Android shows the image as is; iOS needs the app's notification extension.
    ...(message.imageUrl === null
      ? {}
      : { richContent: { image: message.imageUrl }, mutableContent: true }),
  };
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

  async send(message: PushMessage): Promise<PushResult> {
    const hour = new Date(this.now()).getUTCHours(); // Dakar is on UTC all year.
    const targets = recipients(
      await this.options.subscriptions.following(message.category),
      message.category,
      hour,
    );
    const messages = targets.flatMap((subscription) => {
      const version = versionFor(message, subscription.lang);
      return version === undefined ? [] : [expoMessage(subscription.token, message, version)];
    });
    let delivered = 0;
    const gone: string[] = [];
    const perSecond = this.options.chunksPerSecond ?? CHUNKS_PER_SECOND;
    const started = Date.now();
    for (let start = 0; start < messages.length; start += CHUNK) {
      const chunk = messages.slice(start, start + CHUNK);
      // Paced: request n leaves no sooner than n / perSecond seconds after the first.
      await sleep(Math.max(0, started + ((start / CHUNK) * 1000) / perSecond - Date.now()));
      try {
        const tickets = await this.postPatiently(chunk);
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
    return { outcome: "sent", recipients: messages.length };
  }

  /** Tries again, later and later, only when Expo said "too fast". */
  private postPatiently(chunk: readonly object[]): Promise<Ticket[]> {
    const baseDelayMs = this.options.retryBaseDelayMs ?? RATE_RETRY.baseDelayMs;
    return retry(() => this.post(chunk), {
      idempotent: true,
      ...RATE_RETRY,
      baseDelayMs,
      maxDelayMs: Math.max(baseDelayMs, RATE_RETRY.maxDelayMs),
      shouldRetry: (error) => error instanceof RateLimitedError,
    });
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
    if (response.status === 429) {
      throw new RateLimitedError("Expo push asked to slow down");
    }
    if (!response.ok) {
      throw new Error(`Expo push answered ${String(response.status)}`);
    }
    const body = (await response.json()) as { data?: Ticket[] };
    return body.data ?? [];
  }
}
