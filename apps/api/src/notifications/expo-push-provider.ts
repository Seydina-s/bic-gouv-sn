import { createTranslator, fr } from "@bgs/i18n";
import { retry, sleep, withTimeout } from "@bgs/resilience";
import { followsSection, isQuietHour, type PushSubscription } from "@bgs/shared-types";
import type { PushProblemListener, PushProvider, PushResult } from "./notifications";
import { type PushMessage, versionFor } from "./push-message";
import type { PushSubscriptionStore } from "./push-subscriptions";

/** Expo's push service (free): it relays to Apple and Google. */
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
/** Where Apple's and Google's answers are read, a while after sending. */
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
/** Messages per request, Expo's limit. */
const CHUNK = 100;
/** Receipt ids per request, Expo's limit. */
const RECEIPTS_CHUNK = 1000;
/** Expo advises reading receipts about 15 minutes after sending. */
const RECEIPTS_AFTER_MS = 15 * 60_000;
/** The phone is gone (app removed): its token is forgotten, nothing to report. */
const GONE = "DeviceNotRegistered";
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
  id?: string;
  details?: { error?: string };
}

type Receipt = Omit<Ticket, "id">;

/** A ticket Expo gave for one phone: its receipt says later whether it arrived. */
interface Issued {
  id: string;
  token: string;
}

/** The distinct error names, for a report that fits on one line. */
function summary(errors: readonly string[]): string {
  return [...new Set(errors)].join(", ");
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
  /** When receipts are read after sending; null: never (tests read them by hand). */
  receiptsAfterMs?: number | null;
}

/**
 * The subscriptions to reach now: following the section (any section for a written
 * message, category null), outside their quiet hours.
 */
export function recipients(
  subscriptions: readonly PushSubscription[],
  category: string | null,
  hour: number,
): PushSubscription[] {
  return subscriptions.filter(
    (subscription) =>
      (category === null || followsSection(subscription, category)) &&
      !isQuietHour(subscription.quietHours, hour),
  );
}

/** One phone's message: the title, the first words, the source (articles), the photo. */
function expoMessage(
  token: string,
  message: PushMessage,
  version: { title: string; excerpt: string },
) {
  const source =
    message.source === null ? "" : t("content.sourceAttribution", { source: message.source });
  return {
    to: token,
    title: version.title,
    body: [version.excerpt, source].filter((line) => line !== "").join("\n"),
    // The photo's address travels in the data too: the iPhone's notification
    // extension (apps/mobile/targets/notification-service) reads it there.
    data: {
      ...(message.articleId === null ? {} : { articleId: message.articleId }),
      ...(message.imageUrl === null ? {} : { imageUrl: message.imageUrl }),
    },
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
 * forgotten. An article goes with its official title and its source; a message
 * written in the console reaches every subscribed phone.
 *
 * Every other refusal is reported, at sending (Expo) and in the receipts read
 * later (Apple, Google): until 03/11/2026 they were dropped, and notifications
 * could stop arriving with nothing in the console.
 */
export class ExpoPushProvider implements PushProvider {
  readonly ready = true;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private report: PushProblemListener = () => undefined;

  constructor(private readonly options: ExpoPushOptions) {
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.now = options.now ?? Date.now;
  }

  reportProblemsTo(listener: PushProblemListener): void {
    this.report = listener;
  }

  async send(message: PushMessage): Promise<PushResult> {
    const hour = new Date(this.now()).getUTCHours(); // Dakar is on UTC all year.
    const { category } = message;
    const subscribed = await (category === null
      ? this.options.subscriptions.list()
      : this.options.subscriptions.following(category));
    const targets = recipients(subscribed, category, hour);
    const messages = targets.flatMap((subscription) => {
      const version = versionFor(message, subscription.lang);
      return version === undefined ? [] : [expoMessage(subscription.token, message, version)];
    });
    const chunks = Math.ceil(messages.length / CHUNK);
    let delivered = 0;
    const gone: string[] = [];
    const refused: string[] = [];
    const issued: Issued[] = [];
    const perSecond = this.options.chunksPerSecond ?? CHUNKS_PER_SECOND;
    const started = Date.now();
    for (let start = 0; start < messages.length; start += CHUNK) {
      const chunk = messages.slice(start, start + CHUNK);
      // Paced: request n leaves no sooner than n / perSecond seconds after the first.
      await sleep(Math.max(0, started + ((start / CHUNK) * 1000) / perSecond - Date.now()));
      try {
        const tickets = await this.postPatiently(chunk);
        tickets.forEach((ticket, index) => {
          const token = chunk[index]?.to ?? "";
          if (ticket.status === "ok") {
            if (ticket.id !== undefined) {
              issued.push({ id: ticket.id, token });
            }
          } else if (ticket.details?.error === GONE) {
            gone.push(token);
          } else {
            refused.push(ticket.details?.error ?? "unknown");
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
    if (refused.length > 0) {
      this.report("PUSH_REJECTED", summary(refused), refused.length);
    }
    if (delivered < chunks) {
      this.report("PUSH_SERVICE_UNREACHABLE", "sending", chunks - delivered);
    }
    if (messages.length > 0 && delivered === 0) {
      throw new Error("Expo push service unreachable");
    }
    this.readReceiptsLater(issued);
    return { outcome: "sent", recipients: messages.length };
  }

  private readReceiptsLater(issued: readonly Issued[]): void {
    const after =
      this.options.receiptsAfterMs === undefined ? RECEIPTS_AFTER_MS : this.options.receiptsAfterMs;
    if (issued.length === 0 || after === null) {
      return;
    }
    setTimeout(() => {
      this.readReceipts(issued).catch((error: unknown) => {
        // The error's name only: its message varies, and each variant would be a new group.
        const name = error instanceof Error ? error.name : "unknown";
        this.report("PUSH_SERVICE_UNREACHABLE", `receipts: ${name}`, issued.length);
      });
    }, after).unref();
  }

  /**
   * Apple's and Google's answers: phones gone are forgotten, any other refusal is
   * reported (wrong credentials, message too big…).
   */
  async readReceipts(issued: readonly Issued[]): Promise<void> {
    const tokenOf = new Map(issued.map((item) => [item.id, item.token]));
    const gone: string[] = [];
    const refused: string[] = [];
    for (let start = 0; start < issued.length; start += RECEIPTS_CHUNK) {
      const ids = issued.slice(start, start + RECEIPTS_CHUNK).map((item) => item.id);
      const receipts =
        (await this.postJson<Record<string, Receipt> | undefined>(EXPO_RECEIPTS_URL, { ids })) ??
        {};
      for (const [id, receipt] of Object.entries(receipts)) {
        if (receipt.status === "ok") {
          continue;
        }
        if (receipt.details?.error === GONE) {
          gone.push(tokenOf.get(id) ?? "");
        } else {
          refused.push(receipt.details?.error ?? "unknown");
        }
      }
    }
    if (gone.length > 0) {
      await this.options.subscriptions.remove(gone);
    }
    if (refused.length > 0) {
      this.report("PUSH_NOT_DELIVERED", summary(refused), refused.length);
    }
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
    return (await this.postJson<Ticket[] | undefined>(EXPO_PUSH_URL, chunk)) ?? [];
  }

  /** One request to Expo; the answer's `data`. */
  private async postJson<T>(url: string, payload: unknown): Promise<T> {
    const response = await withTimeout(
      (signal) =>
        this.fetchImpl(url, {
          method: "POST",
          signal,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
            ...(this.options.accessToken === undefined
              ? {}
              : { authorization: `Bearer ${this.options.accessToken}` }),
          },
          body: JSON.stringify(payload),
        }),
      { timeoutMs: TIMEOUT_MS },
    );
    if (response.status === 429) {
      throw new RateLimitedError("Expo push asked to slow down");
    }
    if (!response.ok) {
      throw new Error(`Expo push answered ${String(response.status)}`);
    }
    const body = (await response.json()) as { data?: T };
    return body.data as T;
  }
}
