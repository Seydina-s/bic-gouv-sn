import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { notificationSchema, type Notification } from "@bgs/shared-types";
import { z } from "zod";
import type { Database } from "../database/database";

/** Where the notifications prepared and decided in the console are kept. */
export interface NotificationStore {
  all(): Promise<Notification[]>;
  /**
   * Changes the list one writer at a time, across every API instance: two
   * decisions never overwrite each other, and a rule checked inside `change`
   * still holds when the change is written.
   */
  update<T>(
    change: (notifications: Notification[]) => { next: Notification[]; result: T },
  ): Promise<T>;
}

const fileSchema = z.object({
  schemaVersion: z.literal(1),
  notifications: z.array(notificationSchema),
});

/** One validated JSON file, written durably: for a single API instance. */
export class FileNotificationStore implements NotificationStore {
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

/** Any number: the instances changing the notifications take turns. */
const NOTIFICATIONS_LOCK = 20_260_930;

const rowSchema = z.object({ id: z.string(), data: z.unknown() });

/**
 * PostgreSQL: one row per notification, the whole notification validated on the
 * way in and out. A change reads and writes under one lock, in one transaction
 * (SCALE-02).
 */
export class PostgresNotificationStore implements NotificationStore {
  constructor(private readonly database: Database) {}

  private static parse(rows: unknown[]): Notification[] {
    return rows.map((row) => notificationSchema.parse(rowSchema.parse(row).data));
  }

  async all(): Promise<Notification[]> {
    return PostgresNotificationStore.parse(
      (await this.database.query("SELECT id, data FROM notifications ORDER BY id")).rows,
    );
  }

  update<T>(
    change: (notifications: Notification[]) => { next: Notification[]; result: T },
  ): Promise<T> {
    return this.database.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock($1)", [NOTIFICATIONS_LOCK]);
      const before = PostgresNotificationStore.parse(
        (await tx.query("SELECT id, data FROM notifications")).rows,
      );
      const { next, result } = change(before);
      const previous = new Map(before.map((item) => [item.id, JSON.stringify(item)]));
      for (const item of next.map((one) => notificationSchema.parse(one))) {
        const json = JSON.stringify(item);
        if (previous.get(item.id) !== json) {
          await tx.query(
            `INSERT INTO notifications (id, data) VALUES ($1, $2::jsonb)
             ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
            [item.id, json],
          );
        }
        previous.delete(item.id);
      }
      if (previous.size > 0) {
        await tx.query("DELETE FROM notifications WHERE id = ANY($1::text[])", [
          [...previous.keys()],
        ]);
      }
      return result;
    });
  }
}
