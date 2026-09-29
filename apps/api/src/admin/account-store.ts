import { readFile } from "node:fs/promises";
import { ROLES } from "@bgs/admin-auth";
import { writeFileDurably } from "@bgs/content-store";
import { z } from "zod";

/** One member of the administration team. */
export const adminAccountSchema = z.strictObject({
  id: z.uuid(),
  /** Lower case: the sign-in compares it exactly. */
  email: z.email().transform((email) => email.toLowerCase()),
  name: z.string().min(1).max(120),
  role: z.enum(ROLES),
  /** Null until its person chooses a password through the activation link. */
  passwordHash: z.string().min(1).nullable(),
  /** A pending activation link: only the code's fingerprint is kept. */
  activation: z
    .strictObject({ codeHash: z.string().min(1), expiresAt: z.iso.datetime() })
    .nullable()
    // Accounts written before activation links existed.
    .default(null),
  totp: z.strictObject({
    /** Sealed secret (SecretBox); null until the second factor is set up. */
    sealedSecret: z.string().nullable(),
    enrolledAt: z.iso.datetime().nullable(),
    /** Last time step accepted: a code works once. */
    lastStep: z.int().nullable(),
  }),
  attempts: z.strictObject({
    failures: z.array(z.number()),
    lockedUntil: z.number().nullable(),
  }),
  disabled: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type AdminAccount = z.infer<typeof adminAccountSchema>;

const fileSchema = z.strictObject({
  schemaVersion: z.literal(1),
  accounts: z.array(adminAccountSchema),
});

export interface AdminAccountStore {
  findByEmail(email: string): Promise<AdminAccount | null>;
  get(id: string): Promise<AdminAccount | null>;
  /** Every account, in the order they were added. */
  list(): Promise<AdminAccount[]>;
  /** Replaces the account with this id, or adds it at the end. */
  save(account: AdminAccount): Promise<void>;
  /** Adds a new account unless its e-mail address is already used; false then. */
  add(account: AdminAccount): Promise<boolean>;
  /**
   * Changes one account from its latest saved state, so a change made meanwhile
   * (a role, a failed sign-in) is never undone. Null when there is no such account.
   */
  update(id: string, change: (account: AdminAccount) => AdminAccount): Promise<AdminAccount | null>;
}

/**
 * Provisional account store: one validated JSON file, written durably (PostgreSQL
 * later, behind the same interface). A handful of accounts: read in full each time.
 * Writes go one at a time, so two changes never overwrite each other.
 */
export class FileAdminAccountStore implements AdminAccountStore {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly path: string) {}

  async findByEmail(email: string): Promise<AdminAccount | null> {
    const wanted = email.trim().toLowerCase();
    return (await this.all()).find((account) => account.email === wanted) ?? null;
  }

  async get(id: string): Promise<AdminAccount | null> {
    return (await this.all()).find((account) => account.id === id) ?? null;
  }

  list(): Promise<AdminAccount[]> {
    return this.all();
  }

  save(account: AdminAccount): Promise<void> {
    const valid = adminAccountSchema.parse(account);
    return this.change((accounts) => {
      const known = accounts.some((existing) => existing.id === valid.id);
      return {
        next: known
          ? accounts.map((existing) => (existing.id === valid.id ? valid : existing))
          : [...accounts, valid],
        result: undefined,
      };
    });
  }

  add(account: AdminAccount): Promise<boolean> {
    const valid = adminAccountSchema.parse(account);
    return this.change((accounts) =>
      accounts.some((existing) => existing.email === valid.email)
        ? { next: null, result: false }
        : { next: [...accounts, valid], result: true },
    );
  }

  update(
    id: string,
    change: (account: AdminAccount) => AdminAccount,
  ): Promise<AdminAccount | null> {
    return this.change((accounts) => {
      const current = accounts.find((account) => account.id === id);
      if (current === undefined) {
        return { next: null, result: null };
      }
      const updated = adminAccountSchema.parse(change(current));
      return {
        next: accounts.map((account) => (account.id === id ? updated : account)),
        result: updated,
      };
    });
  }

  /** One writer at a time; a null list leaves the file untouched. */
  private change<T>(
    apply: (accounts: AdminAccount[]) => { next: AdminAccount[] | null; result: T },
  ): Promise<T> {
    const run = this.queue.then(async () => {
      const { next, result } = apply(await this.all());
      if (next !== null) {
        const file = { schemaVersion: 1 as const, accounts: next };
        await writeFileDurably(this.path, JSON.stringify(file, null, 2));
      }
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async all(): Promise<AdminAccount[]> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
    // A damaged file is refused (throws): never sign anyone in on corrupt data.
    return fileSchema.parse(JSON.parse(raw)).accounts;
  }
}
