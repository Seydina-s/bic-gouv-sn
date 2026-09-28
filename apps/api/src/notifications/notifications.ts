import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { writeFileDurably, type ArticleRepository } from "@bgs/content-store";
import {
  notificationSchema,
  publishedTranslation,
  type ErrorCode,
  type Lang,
  type Notification,
} from "@bgs/shared-types";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";

/**
 * Hands an approved notification to a push service (CLAUDE.md §4.2: a provider
 * behind an interface). None is set up while the app cannot receive notifications
 * yet (it needs a test build): approving then records, and says nothing was sent.
 */
export interface PushProvider {
  readonly ready: boolean;
  send(notification: Notification): Promise<"sent" | "not-sent">;
}

export const noPushProvider: PushProvider = {
  ready: false,
  send: () => Promise.resolve("not-sent"),
};

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  notifications: z.array(notificationSchema),
});

/** Provisional store of the notifications: one validated JSON file, written durably. */
export class FileNotificationStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  async all(): Promise<Notification[]> {
    try {
      return fileSchema.parse(JSON.parse(await readFile(this.path, "utf8"))).notifications;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  /** Changes the list one writer at a time: two decisions never overwrite each other. */
  update<T>(
    change: (notifications: Notification[]) => { next: Notification[]; result: T },
  ): Promise<T> {
    const run = this.queue.then(async () => {
      const { next, result } = change(await this.all());
      await writeFileDurably(
        this.path,
        JSON.stringify({ schemaVersion: 1, notifications: next }, null, 2),
      );
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

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
export class NotificationService {
  constructor(
    private readonly store: FileNotificationStore,
    private readonly articles: ArticleRepository,
    private readonly push: PushProvider,
    private readonly journal: AuditJournal,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get canSend(): boolean {
    return this.push.ready;
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
    await this.store.update((all) => ({ next: [...all, notification], result: null }));
    await this.record(person, "notification.prepared", notification);
    return notification;
  }

  async approve(person: Person, id: string): Promise<Notification> {
    const approved = await this.decide(person, id, "approved");
    const outcome = await this.push.send(approved);
    const delivered = await this.store.update((all) => {
      const next = all.map((item) =>
        item.id === id ? { ...item, delivery: { outcome, at: this.now().toISOString() } } : item,
      );
      return { next, result: next.find((item) => item.id === id) ?? approved };
    });
    await this.record(person, "notification.approved", delivered, { delivery: outcome });
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
    extra: Record<string, string> = {},
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
