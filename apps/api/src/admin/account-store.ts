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
  passwordHash: z.string().min(1),
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
  /** Creates or replaces the account with this id. */
  save(account: AdminAccount): Promise<void>;
}

/**
 * Provisional account store: one validated JSON file, written durably (PostgreSQL
 * later, behind the same interface). A handful of accounts: read in full each time.
 */
export class FileAdminAccountStore implements AdminAccountStore {
  constructor(private readonly path: string) {}

  async findByEmail(email: string): Promise<AdminAccount | null> {
    const wanted = email.trim().toLowerCase();
    return (await this.all()).find((account) => account.email === wanted) ?? null;
  }

  async get(id: string): Promise<AdminAccount | null> {
    return (await this.all()).find((account) => account.id === id) ?? null;
  }

  async save(account: AdminAccount): Promise<void> {
    const valid = adminAccountSchema.parse(account);
    const others = (await this.all()).filter((existing) => existing.id !== valid.id);
    const file = { schemaVersion: 1 as const, accounts: [...others, valid] };
    await writeFileDurably(this.path, JSON.stringify(file, null, 2));
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
