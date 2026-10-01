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
import type { Queryable } from "../database/database";

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  subscriptions: z.array(pushSubscriptionSchema),
});

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

  constructor(private readonly path: string) {}

  async list(): Promise<PushSubscription[]> {
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
    const all = await this.list();
    const count = (keep: (item: PushSubscription) => boolean) => all.filter(keep).length;
    return {
      total: all.length,
      everySection: count((item) => item.topics === null),
      quietHours: count((item) => item.quietHours !== null),
      french: count((item) => item.lang === "fr"),
      wolof: count((item) => item.lang === "wo"),
    };
  }

  save(subscription: PushSubscription): Promise<void> {
    return this.change((all) => {
      const others = all.filter((item) => item.token !== subscription.token);
      return followsNothing(subscription) ? others : [...others, subscription];
    });
  }

  remove(tokens: readonly string[]): Promise<void> {
    const gone = new Set(tokens);
    return this.change((all) => all.filter((item) => !gone.has(item.token)));
  }

  private change(apply: (all: PushSubscription[]) => PushSubscription[]): Promise<void> {
    const run = this.queue.then(async () => {
      const subscriptions = apply(await this.list());
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
});

/** PostgreSQL: every API instance reads and writes the same subscriptions (SCALE-02). */
export class PostgresPushSubscriptionStore implements PushSubscriptionStore {
  constructor(private readonly database: Queryable) {}

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
    const { rows } = await this.database.query(
      `SELECT count(*) AS total,
         count(*) FILTER (WHERE topics IS NULL) AS every_section,
         count(*) FILTER (WHERE quiet_hours IS NOT NULL) AS quiet_hours,
         count(*) FILTER (WHERE lang = 'fr') AS french,
         count(*) FILTER (WHERE lang = 'wo') AS wolof
       FROM push_subscriptions`,
    );
    const totals = summaryRowSchema.parse(rows[0]);
    return {
      total: totals.total,
      everySection: totals.every_section,
      quietHours: totals.quiet_hours,
      french: totals.french,
      wolof: totals.wolof,
    };
  }

  async save(subscription: PushSubscription): Promise<void> {
    if (followsNothing(subscription)) {
      await this.remove([subscription.token]);
      return;
    }
    await this.database.query(
      `INSERT INTO push_subscriptions (token, topics, quiet_hours, lang)
       VALUES ($1, $2::text[], $3::jsonb, $4)
       ON CONFLICT (token) DO UPDATE SET
         topics = EXCLUDED.topics, quiet_hours = EXCLUDED.quiet_hours, lang = EXCLUDED.lang`,
      [
        subscription.token,
        subscription.topics,
        // SQL NULL, not the JSON value null.
        subscription.quietHours === null ? null : JSON.stringify(subscription.quietHours),
        subscription.lang,
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
