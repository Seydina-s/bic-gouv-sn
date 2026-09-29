import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { pushSubscriptionSchema, type PushSubscription } from "@bgs/shared-types";
import { z } from "zod";

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  subscriptions: z.array(pushSubscriptionSchema),
});

export interface PushSubscriptionStore {
  /** Every subscription (read when a notification is sent). */
  list(): Promise<PushSubscription[]>;
  /** Adds or replaces the subscription of this token; no section: removes it. */
  save(subscription: PushSubscription): Promise<void>;
  /** Forgets these tokens (unsubscribed, or no longer valid for Expo). */
  remove(tokens: readonly string[]): Promise<void>;
}

/**
 * Provisional store of the push subscriptions: one validated JSON file, written
 * durably, one writer at a time. Holds only what sending needs (token, sections,
 * quiet hours, language). PostgreSQL before the launch at scale (SCALE-01).
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

  save(subscription: PushSubscription): Promise<void> {
    return this.change((all) => {
      const others = all.filter((item) => item.token !== subscription.token);
      return subscription.topics.length === 0 ? others : [...others, subscription];
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
