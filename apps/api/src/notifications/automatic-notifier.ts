import { randomUUID } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import {
  calendarDay,
  publishedTranslation,
  type AutomaticNotifications,
  type NewsArticle,
  type Notification,
} from "@bgs/shared-types";
import { z } from "zod";
import type { AuditJournal } from "../admin/audit-journal";
import type { SettingStore } from "../admin/setting-store";
import type { NotificationStore } from "./notification-store";
import { deliver, type Person, type PushProvider } from "./notifications";
import { pushMessageFor } from "./push-message";

const MINUTE_MS = 60_000;
/** An article first collected longer ago is not announced any more (after a pause). */
const FRESH_MS = 30 * MINUTE_MS;
/** Its cover is processed a little after the text: waited for, at most this long. */
const COVER_WAIT_MS = 3 * MINUTE_MS;
/** Published by the source today or yesterday: an old article collected late is not news. */
const RECENT_DAYS = 1;
/** Newest articles looked at on each pass. */
const SCAN = 20;
const SETTING_KEY = "automatic-notifications";
/** The window the console watches for a sudden run of automatic sendings. */
const RECENT_MS = 30 * MINUTE_MS;

/** Who sends them, in the console's list and in the audit journal. */
export const AUTOMATIC_SENDER: Person = { id: "system:automatic", name: "Envoi automatique" };

const settingSchema = z.object({
  paused: z.boolean(),
  changedBy: z.object({ id: z.string(), name: z.string() }).nullable(),
  changedAt: z.string().nullable(),
});

export interface AutomaticNotifierOptions {
  articles: ArticleRepository;
  store: NotificationStore;
  push: PushProvider;
  journal: AuditJournal;
  settings: SettingStore;
  mediaBaseUrl: string | undefined;
  perHour: number;
  now?: () => Date;
}

/**
 * Announces every new official article to the phones that accepted notifications
 * (decision of 30/09/2026): its title, first words and cover, in each person's
 * language, outside their quiet hours. Once per article, whichever API instance
 * sees it first. Safeguards: a pause in the console, at most `perHour` sendings
 * an hour, and nothing for an article not published (quarantined or withdrawn).
 */
export class AutomaticNotifier {
  private readonly now: () => Date;
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> = Promise.resolve();

  constructor(private readonly options: AutomaticNotifierOptions) {
    this.now = options.now ?? (() => new Date());
  }

  /** The saved pause, or none (never paused before). */
  private async setting() {
    const saved = settingSchema.safeParse(await this.options.settings.get(SETTING_KEY));
    return saved.success ? saved.data : { paused: false, changedBy: null, changedAt: null };
  }

  /** What the console shows: the pause, the hourly cap, the sendings of the last 30 min. */
  async state(): Promise<AutomaticNotifications> {
    const saved = await this.setting();
    const since = new Date(this.now().getTime() - RECENT_MS).toISOString();
    const recentSendings = (await this.options.store.all()).filter(
      (item) => item.origin === "automatic" && item.preparedAt >= since,
    ).length;
    return { ...saved, perHour: this.options.perHour, recentSendings };
  }

  async setPaused(person: Person, paused: boolean): Promise<AutomaticNotifications> {
    const at = this.now().toISOString();
    await this.options.settings.set(SETTING_KEY, { paused, changedBy: person, changedAt: at });
    await this.options.journal.append({
      at,
      actor: person.id,
      action: paused ? "notification.automatic.paused" : "notification.automatic.resumed",
      target: null,
      details: {},
    });
    return this.state();
  }

  /** One pass: the articles announced now (their ids). */
  async tick(): Promise<string[]> {
    // Only the pause is read on each pass: the notifications list stays for the console.
    if (!this.options.push.ready || (await this.setting()).paused) {
      return [];
    }
    const { items } = await this.options.articles.list({ limit: SCAN });
    const announced: string[] = [];
    for (const article of items) {
      if ((await this.isDue(article)) && (await this.announce(article))) {
        announced.push(article.id);
      }
    }
    return announced;
  }

  private async isDue(article: NewsArticle): Promise<boolean> {
    const now = this.now().getTime();
    const oldestDay = calendarDay(now - RECENT_DAYS * 24 * 60 * MINUTE_MS);
    if (article.sourcePublishedOn === null || article.sourcePublishedOn < oldestDay) {
      return false;
    }
    // First collected: the oldest version's time (a correction is not news).
    const [first] = await this.options.articles.history(article.id);
    const age = now - Date.parse((first ?? article).fetchedAt);
    const hasCover = article.images.some((image) => image.role === "cover");
    return age <= FRESH_MS && (hasCover || age >= COVER_WAIT_MS);
  }

  /** Claims the article (once across instances, within the hourly cap), then sends. */
  private async announce(article: NewsArticle): Promise<boolean> {
    const translation =
      publishedTranslation(article, article.lang) ?? publishedTranslation(article, "fr");
    if (translation === undefined || pushMessageFor(article, undefined) === null) {
      return false;
    }
    const at = this.now().toISOString();
    const notification: Notification = {
      id: randomUUID(),
      origin: "automatic",
      articleId: article.id,
      lang: translation.lang,
      title: translation.title,
      category: article.category,
      status: "approved",
      preparedBy: AUTOMATIC_SENDER,
      preparedAt: at,
      decidedBy: AUTOMATIC_SENDER,
      decidedAt: at,
      delivery: null,
    };
    const hourAgo = new Date(this.now().getTime() - 60 * MINUTE_MS).toISOString();
    const claimed = await this.options.store.update((all) => {
      const automatic = all.filter((item) => item.origin === "automatic");
      const already = automatic.some((item) => item.articleId === article.id);
      const lastHour = automatic.filter((item) => item.preparedAt >= hourAgo).length;
      return already || lastHour >= this.options.perHour
        ? { next: all, result: false }
        : { next: [...all, notification], result: true };
    });
    if (!claimed) {
      return false;
    }
    const outcome = await deliver(this.options, article.id);
    await this.options.store.update((all) => ({
      next: all.map((item) =>
        item.id === notification.id
          ? { ...item, delivery: { ...outcome, at: this.now().toISOString() } }
          : item,
      ),
      result: null,
    }));
    await this.options.journal.append({
      at,
      actor: AUTOMATIC_SENDER.id,
      action: "notification.automatic.sent",
      target: notification.id,
      details: {
        articleId: article.id,
        title: notification.title,
        delivery: outcome.outcome,
        ...(outcome.outcome === "sent" ? { recipients: outcome.recipients } : {}),
      },
    });
    return true;
  }

  /** A pass every `intervalMs`, never two at once. */
  start(intervalMs: number, onError: (error: unknown) => void): void {
    this.timer = setInterval(() => {
      this.running = this.running.then(() => this.tick()).catch(onError);
    }, intervalMs);
    this.timer.unref();
  }

  async close(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.running;
  }
}
