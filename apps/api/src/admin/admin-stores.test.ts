import { randomUUID } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firstBrokenEntry } from "@bgs/admin-auth";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config";
import { type Database, migrate } from "@bgs/database";
import { testDatabases } from "@bgs/database/testing";
import type { AdminAccount } from "./account-store";
import { type AdminStores, adminStores } from "./admin-stores";

let cleanups: (() => Promise<void>)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups) {
    await cleanup();
  }
  cleanups = [];
});

async function fileConfig() {
  const dir = await mkdtemp(join(tmpdir(), "bgs-admin-stores-"));
  return loadConfig({
    ADMIN_ACCOUNTS_PATH: join(dir, "accounts.json"),
    ADMIN_AUDIT_PATH: join(dir, "audit.jsonl"),
  });
}

/** Two instances' view of the same accounts and journal. */
type Pair = () => Promise<[AdminStores, AdminStores, Database | null]>;

const pairs: [string, Pair][] = [
  [
    "in files",
    async () => {
      // Files have one writer: a single API instance (no DATABASE_URL).
      const stores = adminStores(await fileConfig(), null);
      return [stores, stores, null];
    },
  ],
  ...testDatabases().map(([name, open]): [string, Pair] => [
    name,
    async () => {
      const database = await open();
      cleanups.push(() => database.close());
      await migrate(database);
      const config = await fileConfig();
      return [adminStores(config, database), adminStores(config, database), database];
    },
  ]),
];

const account = (email: string, name = "Personne"): AdminAccount => ({
  id: randomUUID(),
  email,
  name,
  role: "editor",
  passwordHash: null,
  activation: null,
  totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
  attempts: { failures: [], lockedUntil: null },
  disabled: false,
  createdAt: "2026-09-30T02:00:00.000Z",
});

describe.each(pairs)("the team's accounts and audit journal kept %s", (_name, makePair) => {
  it("create an address once, even when two instances add it at the same time", async () => {
    const [a, b] = await makePair();
    const added = await Promise.all([
      a.accounts.add(account("agent@bic.test", "A")),
      b.accounts.add(account("AGENT@bic.test", "B")),
    ]);
    expect(added.filter(Boolean)).toHaveLength(1);
    expect(await b.accounts.list()).toHaveLength(1);
    expect(await b.accounts.findByEmail(" Agent@BIC.test ")).not.toBeNull();
  });

  it("change an account from its latest state, and keep the order of creation", async () => {
    const [a, b] = await makePair();
    const first = account("un@bic.test");
    await a.accounts.save(first);
    await a.accounts.save(account("deux@bic.test"));
    await Promise.all([
      a.accounts.update(first.id, (current) => ({ ...current, role: "admin" })),
      b.accounts.update(first.id, (current) => ({ ...current, disabled: true })),
    ]);
    expect(await b.accounts.get(first.id)).toMatchObject({ role: "admin", disabled: true });
    expect((await a.accounts.list()).map((item) => item.email)).toEqual([
      "un@bic.test",
      "deux@bic.test",
    ]);
    expect(await a.accounts.update(randomUUID(), (current) => current)).toBeNull();
  });

  it("chain every journal entry, even written by two instances at once", async () => {
    const [a, b] = await makePair();
    const entry = (actor: string) => ({
      at: "2026-09-30T02:00:00.000Z",
      actor,
      action: "sign-in",
      target: null,
      details: { zeta: 1, alpha: "a" },
    });
    await Promise.all([
      ...Array.from({ length: 5 }, () => a.journal.append(entry("a"))),
      ...Array.from({ length: 5 }, () => b.journal.append(entry("b"))),
    ]);
    const entries = await a.journal.entries();
    expect(entries).toHaveLength(10);
    expect(firstBrokenEntry(entries)).toBe(-1);
  });
});

describe.each(testDatabases())("the audit journal in PostgreSQL %s", (_name, open) => {
  it("refuses any change or deletion, whoever asks", async () => {
    const database = await open();
    cleanups.push(() => database.close());
    await migrate(database);
    const { journal } = adminStores(await fileConfig(), database);
    await journal.append({
      at: "2026-09-30T02:00:00.000Z",
      actor: "a",
      action: "sign-in",
      target: null,
      details: {},
    });
    await expect(database.query("UPDATE audit_journal SET entry = '{}'::jsonb")).rejects.toThrow(
      "append-only",
    );
    await expect(database.query("DELETE FROM audit_journal")).rejects.toThrow("append-only");
    expect(await journal.entries()).toHaveLength(1);
  });

  it("refuses a damaged account rather than sign anyone in on it", async () => {
    const database = await open();
    cleanups.push(() => database.close());
    await migrate(database);
    await database.query(
      "INSERT INTO admin_accounts (id, email, data) VALUES ('x', 'x@bic.test', '{}'::jsonb)",
    );
    const { accounts } = adminStores(await fileConfig(), database);
    await expect(accounts.findByEmail("x@bic.test")).rejects.toThrow();
  });
});
