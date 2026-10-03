import type { Config } from "../config";
import { type Database, openDatabase } from "@bgs/database";
import { type AdminAccountStore, FileAdminAccountStore } from "./account-store";
import { type AuditJournal, FileAuditJournal } from "./audit-journal";
import { PostgresAdminAccountStore, PostgresAuditJournal } from "./postgres-admin-stores";

export interface AdminStores {
  accounts: AdminAccountStore;
  journal: AuditJournal;
}

/** The team's accounts and the audit journal: in PostgreSQL when set up, else files. */
export function adminStores(config: Config, database: Database | null): AdminStores {
  return database === null
    ? {
        accounts: new FileAdminAccountStore(config.ADMIN_ACCOUNTS_PATH),
        journal: new FileAuditJournal(config.ADMIN_AUDIT_PATH),
      }
    : {
        accounts: new PostgresAdminAccountStore(database),
        journal: new PostgresAuditJournal(database),
      };
}

/**
 * The same stores for a command-line tool (creating an account, changing the key):
 * the database of DATABASE_URL when set, which the tool closes when done.
 */
export async function adminStoresForCommand(
  config: Config,
): Promise<AdminStores & { close(): Promise<void> }> {
  const database = await openDatabase(config.DATABASE_URL);
  return {
    ...adminStores(config, database),
    close: () => database?.close() ?? Promise.resolve(),
  };
}
