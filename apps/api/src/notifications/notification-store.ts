import { notificationSchema, type Notification } from "@bgs/shared-types";
import type { Database } from "../database/database";
import {
  type DocumentStore,
  FileDocumentStore,
  PostgresDocumentStore,
} from "../database/document-store";

/** Where the notifications prepared and decided in the console are kept. */
export type NotificationStore = DocumentStore<Notification>;

/** One validated JSON file, written durably: for a single API instance. */
export class FileNotificationStore extends FileDocumentStore<Notification> {
  constructor(path: string) {
    super(path, notificationSchema, "notifications");
  }
}

/** Any number: the instances changing the notifications take turns. */
const NOTIFICATIONS_LOCK = 20_260_930;

/** PostgreSQL: every API instance decides on the same notifications (SCALE-02). */
export class PostgresNotificationStore extends PostgresDocumentStore<Notification> {
  constructor(database: Database) {
    super(database, notificationSchema, "notifications", NOTIFICATIONS_LOCK);
  }
}
