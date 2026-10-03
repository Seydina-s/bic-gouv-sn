import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import {
  followsNothing,
  followsSection,
  pushSubscriptionSchema,
  type PushSubscription,
  type SubscribersSummary,
} from "@bgs/shared-types";
import { z } from "zod";
import type { Queryable } from "@bgs/database";

/** A subscription as kept: with when the phone subscribed (none before 01/10/2026). */
const keptSchema = pushSubscriptionSchema.extend({ subscribedAt: z.iso.datetime().optional() });
type Kept = z.infer<typeof keptSchema>;

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  subscriptions: z.array(keptSchema),
});

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** When a phone subscribed, kept to the hour only: enough for the growth check. */
function subscribedHour(now: Date): Date {
  return new Date(Math.floor(now.getTime() / HOUR_MS) * HOUR_MS);
}

/** The two windows of the console's growth check, ending now. */
function growthWindows(now: Date): { dayStart: Date; weekStart: Date } {
  return {
    dayStart: new Date(now.getTime() - DAY_MS),
    weekStart: new Date(now.getTime() - 8 * DAY_MS),
  };
}

export interface PushSubscriptionStore {
  /** Every subscription. */
  list(): Promise<PushSubscription[]>;
  /** The subscriptions following this section (read when a notification is sent). */
  following(topic: string): Promise<PushSubscription[]>;
  /** Adds or replaces the subscription of this token; no section: removes it. */
  save(subscription: PushSubscription): Promise<void>;
  /** Totals for the console: how many phones, which choices (never a token). */
  summary(): Promise<SubscribersSummary>;
  /** Forgets these tokens (unsubscribed, or no longer valid for Expo). */
  remove(tokens: readonly string[]): Promise<void>;
}

/**
 * Provisional store of the push subscriptions: one validated JSON file, written
 * durably, one writer at a time. Holds only what sending needs (token, sections,
 * quiet hours, language). For a single API instance (no DATABASE_URL).
 */
export class FilePushSubscriptionStore implements PushSubscriptionStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(): Promise<PushSubscription[]> {
    // What sending needs, without the day of subscription.
    return (await this.kept()).map(({ token, topics, quietHours, lang }) => ({
      token,
      topics,
      quietHours,
      lang,
    }));
  }

  private async kept(): Promise<Kept[]> {
    try {
      return fileSchema.parse(JSON.parse(await readFile(this.path, "utf8"))).subscriptions;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async following(topic: string): Promise<PushSubscription[]> {
    return (await this.list()).filter((subscription) => followsSection(subscription, topic));
  }

  async summary(): Promise<SubscribersSummary> {
    const all = await this.kept();
    const count = (keep: (item: Kept) => boolean) => all.filter(keep).length;
    const { dayStart, weekStart } = growthWindows(this.now());
    // Subscribed after `from`, and up to `to` when given; undated phones never count.
    const subscribedBetween = (from: Date, to?: Date) => (item: Kept) => {
      if (item.subscribedAt === undefined) {
        return false;
      }
      const at = new Date(item.subscribedAt);
      return at > from && (to === undefined || at <= to);
    };
    return {
      total: all.length,
      everySection: count((item) => item.topics === null),
      quietHours: count((item) => item.quietHours !== null),
      french: count((item) => item.lang === "fr"),
      wolof: count((item) => item.lang === "wo"),
      newLastDay: count(subscribedBetween(dayStart)),
      newWeekBefore: count(subscribedBetween(weekStart, dayStart)),
    };
  }

  save(subscription: PushSubscription): Promise<void> {
    return this.change((all) => {
      const previous = all.find((item) => item.token === subscription.token);
      const others = all.filter((item) => item !== previous);
      if (followsNothing(subscription)) {
        return others;
      }
      // A phone changing its choices keeps the day it first subscribed.
      const subscribedAt =
        previous === undefined ? subscribedHour(this.now()).toISOString() : previous.subscribedAt;
      return [
        ...others,
        { ...subscription, ...(subscribedAt === undefined ? {} : { subscribedAt }) },
      ];
    });
  }

  remove(tokens: readonly string[]): Promise<void> {
    const gone = new Set(tokens);
    return this.change((all) => all.filter((item) => !gone.has(item.token)));
  }

  private change(apply: (all: Kept[]) => Kept[]): Promise<void> {
    const run = this.queue.then(async () => {
      const subscriptions = apply(await this.kept());
      await writeFileDurably(this.path, JSON.stringify({ schemaVersion: 1, subscriptions }));
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}

const rowSchema = z.object({
  token: z.string(),
  topics: z.array(z.string()).nullable(),
  quiet_hours: z.unknown(),
  lang: z.string(),
});

const SELECT = "SELECT token, topics, quiet_hours, lang FROM push_subscriptions";

const count = z.coerce.number().int().nonnegative();
const summaryRowSchema = z.object({
  total: count,
  every_section: count,
  quiet_hours: count,
  french: count,
  wolof: count,
  new_last_day: count,
  new_week_before: count,
});

/** PostgreSQL: every API instance reads and writes the same subscriptions (SCALE-02). */
export class PostgresPushSubscriptionStore implements PushSubscriptionStore {
  constructor(
    private readonly database: Queryable,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private static parse(rows: unknown[]): PushSubscription[] {
    return rows.map((row) => {
      const { quiet_hours: quietHours, ...rest } = rowSchema.parse(row);
      return pushSubscriptionSchema.parse({ ...rest, quietHours });
    });
  }

  async list(): Promise<PushSubscription[]> {
    return PostgresPushSubscriptionStore.parse(
      (await this.database.query(`${SELECT} ORDER BY token`)).rows,
    );
  }

  async following(topic: string): Promise<PushSubscription[]> {
    // Null: every section. "@>" (contains) is what the index on the sections answers.
    const { rows } = await this.database.query(
      `${SELECT} WHERE topics IS NULL OR topics @> ARRAY[$1]::text[] ORDER BY token`,
      [topic],
    );
    return PostgresPushSubscriptionStore.parse(rows);
  }

  async summary(): Promise<SubscribersSummary> {
    const { dayStart, weekStart } = growthWindows(this.now());
    const { rows } = await this.database.query(
      `SELECT count(*) AS total,
         count(*) FILTER (WHERE topics IS NULL) AS every_section,
         count(*) FILTER (WHERE quiet_hours IS NOT NULL) AS quiet_hours,
         count(*) FILTER (WHERE lang = 'fr') AS french,
         count(*) FILTER (WHERE lang = 'wo') AS wolof,
         count(*) FILTER (WHERE subscribed_at > $1) AS new_last_day,
         count(*) FILTER (WHERE subscribed_at > $2 AND subscribed_at <= $1) AS new_week_before
       FROM push_subscriptions`,
      [dayStart, weekStart],
    );
    const totals = summaryRowSchema.parse(rows[0]);
    return {
      total: totals.total,
      everySection: totals.every_section,
      quietHours: totals.quiet_hours,
      french: totals.french,
      wolof: totals.wolof,
      newLastDay: totals.new_last_day,
      newWeekBefore: totals.new_week_before,
    };
  }

  async save(subscription: PushSubscription): Promise<void> {
    if (followsNothing(subscription)) {
      await this.remove([subscription.token]);
      return;
    }
    await this.database.query(
      // A phone changing its choices keeps the day it first subscribed.
      `INSERT INTO push_subscriptions (token, topics, quiet_hours, lang, subscribed_at)
       VALUES ($1, $2::text[], $3::jsonb, $4, $5)
       ON CONFLICT (token) DO UPDATE SET
         topics = EXCLUDED.topics, quiet_hours = EXCLUDED.quiet_hours, lang = EXCLUDED.lang`,
      [
        subscription.token,
        subscription.topics,
        // SQL NULL, not the JSON value null.
        subscription.quietHours === null ? null : JSON.stringify(subscription.quietHours),
        subscription.lang,
        subscribedHour(this.now()),
      ],
    );
  }

  async remove(tokens: readonly string[]): Promise<void> {
    if (tokens.length > 0) {
      await this.database.query("DELETE FROM push_subscriptions WHERE token = ANY($1::text[])", [
        tokens,
      ]);
    }
  }
}

/** How long the console's totals are reused: they need not be to the second. */
export const SUMMARY_TTL_MS = 60_000;

/**
 * The console's totals, counted at most once per `ttlMs` and shared by the requests
 * meanwhile: counting every subscription is slow once there are millions of phones,
 * and the console's first screen reads them on each visit. A failed count is not kept.
 */
export function cachedSummary(
  store: Pick<PushSubscriptionStore, "summary">,
  ttlMs = SUMMARY_TTL_MS,
  now: () => number = () => Date.now(),
): () => Promise<SubscribersSummary> {
  let kept: { at: number; value: Promise<SubscribersSummary> } | null = null;
  return () => {
    const at = now();
    if (kept === null || at - kept.at >= ttlMs) {
      const value = store.summary();
      kept = { at, value };
      value.catch(() => {
        if (kept?.value === value) {
          kept = null;
        }
      });
    }
    return kept.value;
  };
}
