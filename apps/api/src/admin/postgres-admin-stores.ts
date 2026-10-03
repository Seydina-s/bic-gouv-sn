import { chainEntry, type AuditEntry, type AuditInput } from "@bgs/admin-auth";
import { z } from "zod";
import type { Database, Queryable } from "@bgs/database";
import { adminAccountSchema, type AdminAccount, type AdminAccountStore } from "./account-store";
import type { AuditJournal } from "./audit-journal";

/** Any numbers: the instances changing accounts, or writing the journal, take turns. */
const ACCOUNTS_LOCK = 20_260_931;
const AUDIT_LOCK = 20_260_932;

const accountRowSchema = z.object({ data: z.unknown() });

/**
 * The team's accounts in PostgreSQL (SCALE-02): one validated row each, the
 * e-mail address unique. Every change reads and writes under one lock, in one
 * transaction: a change made meanwhile on another instance is never undone.
 * A damaged row is refused (throws): never sign anyone in on corrupt data.
 */
export class PostgresAdminAccountStore implements AdminAccountStore {
  constructor(private readonly database: Database) {}

  private static parse(rows: unknown[]): AdminAccount[] {
    return rows.map((row) => adminAccountSchema.parse(accountRowSchema.parse(row).data));
  }

  private static async all(db: Queryable): Promise<AdminAccount[]> {
    const { rows } = await db.query("SELECT data FROM admin_accounts ORDER BY position");
    return PostgresAdminAccountStore.parse(rows);
  }

  private static async write(db: Queryable, account: AdminAccount): Promise<void> {
    const valid = adminAccountSchema.parse(account);
    await db.query(
      `INSERT INTO admin_accounts (id, email, data) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, data = EXCLUDED.data`,
      [valid.id, valid.email, JSON.stringify(valid)],
    );
  }

  private locked<T>(work: (tx: Queryable) => Promise<T>): Promise<T> {
    return this.database.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock($1)", [ACCOUNTS_LOCK]);
      return work(tx);
    });
  }

  async findByEmail(email: string): Promise<AdminAccount | null> {
    const { rows } = await this.database.query("SELECT data FROM admin_accounts WHERE email = $1", [
      email.trim().toLowerCase(),
    ]);
    return PostgresAdminAccountStore.parse(rows)[0] ?? null;
  }

  async get(id: string): Promise<AdminAccount | null> {
    const { rows } = await this.database.query("SELECT data FROM admin_accounts WHERE id = $1", [
      id,
    ]);
    return PostgresAdminAccountStore.parse(rows)[0] ?? null;
  }

  list(): Promise<AdminAccount[]> {
    return PostgresAdminAccountStore.all(this.database);
  }

  save(account: AdminAccount): Promise<void> {
    return this.locked((tx) => PostgresAdminAccountStore.write(tx, account));
  }

  add(account: AdminAccount): Promise<boolean> {
    return this.locked(async (tx) => {
      const valid = adminAccountSchema.parse(account);
      const all = await PostgresAdminAccountStore.all(tx);
      if (all.some((existing) => existing.email === valid.email)) {
        return false;
      }
      await PostgresAdminAccountStore.write(tx, valid);
      return true;
    });
  }

  update(
    id: string,
    change: (account: AdminAccount, all: readonly AdminAccount[]) => AdminAccount,
  ): Promise<AdminAccount | null> {
    return this.locked(async (tx) => {
      const all = await PostgresAdminAccountStore.all(tx);
      const current = all.find((account) => account.id === id);
      if (current === undefined) {
        return null;
      }
      const updated = adminAccountSchema.parse(change(current, all));
      await PostgresAdminAccountStore.write(tx, updated);
      return updated;
    });
  }
}

const auditRowSchema = z.object({ entry: z.unknown() });

/**
 * The audit journal in PostgreSQL: append-only (the database itself refuses any
 * change or deletion), each entry chained to the previous one (@bgs/admin-auth).
 * Appends take turns across every instance, so two never chain to the same entry.
 */
export class PostgresAuditJournal implements AuditJournal {
  constructor(private readonly database: Database) {}

  append(input: AuditInput): Promise<AuditEntry> {
    return this.database.transaction(async (tx) => {
      await tx.query("SELECT pg_advisory_xact_lock($1)", [AUDIT_LOCK]);
      const { rows } = await tx.query(
        "SELECT entry FROM audit_journal ORDER BY position DESC LIMIT 1",
      );
      const last = rows[0] === undefined ? null : PostgresAuditJournal.toEntry(rows[0]);
      const entry = chainEntry(last, input);
      await tx.query("INSERT INTO audit_journal (entry) VALUES ($1::jsonb)", [
        JSON.stringify(entry),
      ]);
      return entry;
    });
  }

  async entries(): Promise<AuditEntry[]> {
    const { rows } = await this.database.query("SELECT entry FROM audit_journal ORDER BY position");
    return rows.map((row) => PostgresAuditJournal.toEntry(row));
  }

  /** As written: the chain's fingerprints are checked by the console, not here. */
  private static toEntry(row: unknown): AuditEntry {
    return auditRowSchema.parse(row).entry as AuditEntry;
  }
}
