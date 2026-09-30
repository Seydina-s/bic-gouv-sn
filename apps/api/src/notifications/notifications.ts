import { randomUUID } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import {
  publishedTranslation,
  type ErrorCode,
  type Lang,
  type Notification,
} from "@bgs/shared-types";
import type { AuditJournal } from "../admin/audit-journal";
import type { NotificationStore } from "./notification-store";
import { type PushMessage, pushMessageFor } from "./push-message";

/**
 * Hands an approved notification to a push service (CLAUDE.md §4.2: a provider
 * behind an interface). None is set up while the app cannot receive notifications
 * yet (it needs a test build): approving then records, and says nothing was sent.
 */
/** What became of a notification handed to the push service. */
export type PushResult = { outcome: "sent"; recipients: number } | { outcome: "not-sent" };

export interface PushProvider {
  readonly ready: boolean;
  send(message: PushMessage): Promise<PushResult>;
}

export const noPushProvider: PushProvider = {
  ready: false,
  send: () => Promise.resolve({ outcome: "not-sent" }),
};

/** Where a delivery stands, as kept with the notification. */
export type Delivery = { outcome: "failed" } | PushResult;

/** A rule of the two-person workflow was not met; the code explains it in the console. */
export class NotificationRuleError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "NotificationRuleError";
  }
}

export interface Person {
  id: string;
  name: string;
}

/**
 * The two-person workflow: one person prepares (an official article, its own title),
 * another approves (then it is handed to the push service) or either cancels. Every
 * step goes to the audit journal.
 */
export interface NotificationServices {
  store: NotificationStore;
  articles: ArticleRepository;
  push: PushProvider;
  journal: AuditJournal;
  /** Public address of the media (CDN): the cover shown in the notification. */
  mediaBaseUrl: string | undefined;
  now?: () => Date;
}

/**
 * Hands the notification of an article to the push service: its title and first
 * words in each language, and its cover. "failed" when the article is gone or the
 * service fails: never an approval without a result.
 */
export async function deliver(
  {
    articles,
    push,
    mediaBaseUrl,
  }: Pick<NotificationServices, "articles" | "push" | "mediaBaseUrl">,
  articleId: string,
): Promise<Delivery> {
  const article = await articles.get(articleId);
  const message = article === null ? null : pushMessageFor(article, mediaBaseUrl);
  if (message === null) {
    return { outcome: "failed" };
  }
  return push.send(message).catch((): Delivery => ({ outcome: "failed" }));
}

export class NotificationService {
  private readonly store: NotificationStore;
  private readonly articles: ArticleRepository;
  private readonly journal: AuditJournal;
  private readonly now: () => Date;

  constructor(private readonly services: NotificationServices) {
    this.store = services.store;
    this.articles = services.articles;
    this.journal = services.journal;
    this.now = services.now ?? (() => new Date());
  }

  get canSend(): boolean {
    return this.services.push.ready;
  }

  /** Latest first. */
  async list(): Promise<Notification[]> {
    return (await this.store.all()).sort((a, b) => b.preparedAt.localeCompare(a.preparedAt));
  }

  async prepare(person: Person, articleId: string, lang: Lang): Promise<Notification> {
    const article = await this.articles.get(articleId);
    const translation = article === null ? undefined : publishedTranslation(article, lang);
    if (article === null || translation === undefined) {
      throw new NotificationRuleError("NOTIFICATION_ARTICLE_UNKNOWN");
    }
    const notification: Notification = {
      id: randomUUID(),
      origin: "console",
      articleId,
      lang,
      title: translation.title,
      category: article.category,
      status: "pending",
      preparedBy: person,
      preparedAt: this.now().toISOString(),
      decidedBy: null,
      decidedAt: null,
      delivery: null,
    };
    await this.store.update((all) => {
      // Checked in the same write: two people preparing the same article at once
      // must not end up with two national sendings to approve.
      const waiting = all.some(
        (item) => item.articleId === articleId && item.lang === lang && item.status === "pending",
      );
      if (waiting) {
        throw new NotificationRuleError("NOTIFICATION_ALREADY_PENDING");
      }
      return { next: [...all, notification], result: null };
    });
    await this.record(person, "notification.prepared", notification);
    return notification;
  }

  async approve(person: Person, id: string): Promise<Notification> {
    const approved = await this.decide(person, id, "approved");
    const outcome = await deliver(this.services, approved.articleId);
    const delivered = await this.store.update((all) => {
      const next = all.map((item) =>
        item.id === id ? { ...item, delivery: { ...outcome, at: this.now().toISOString() } } : item,
      );
      return { next, result: next.find((item) => item.id === id) ?? approved };
    });
    await this.record(person, "notification.approved", delivered, {
      delivery: outcome.outcome,
      ...(outcome.outcome === "sent" ? { recipients: outcome.recipients } : {}),
    });
    return delivered;
  }

  async cancel(person: Person, id: string): Promise<Notification> {
    const cancelled = await this.decide(person, id, "cancelled");
    await this.record(person, "notification.cancelled", cancelled);
    return cancelled;
  }

  private decide(
    person: Person,
    id: string,
    status: "approved" | "cancelled",
  ): Promise<Notification> {
    return this.store.update((all) => {
      const current = all.find((item) => item.id === id);
      if (current === undefined) {
        throw new NotificationRuleError("NOTIFICATION_NOT_FOUND");
      }
      if (current.status !== "pending") {
        throw new NotificationRuleError("NOTIFICATION_NOT_PENDING");
      }
      // The second pair of eyes: whoever prepared it may cancel it, never approve it.
      if (status === "approved" && current.preparedBy.id === person.id) {
        throw new NotificationRuleError("NOTIFICATION_SAME_PERSON");
      }
      const decided = {
        ...current,
        status,
        decidedBy: person,
        decidedAt: this.now().toISOString(),
      };
      return { next: all.map((item) => (item.id === id ? decided : item)), result: decided };
    });
  }

  private async record(
    person: Person,
    action: string,
    notification: Notification,
    extra: Record<string, string | number> = {},
  ) {
    await this.journal.append({
      at: this.now().toISOString(),
      actor: person.id,
      action,
      target: notification.id,
      details: { articleId: notification.articleId, title: notification.title, ...extra },
    });
  }
}
