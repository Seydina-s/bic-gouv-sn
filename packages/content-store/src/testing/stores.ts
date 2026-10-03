import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "@bgs/database";
import { testDatabases } from "@bgs/database/testing";
import type { Database } from "@bgs/database";

/** One store under test, and how to throw it away. */
export interface OpenedStore<S> {
  store: S;
  close: () => Promise<void>;
}

/**
 * Every storage a store must behave the same on (SCALE-02): a JSON file in a fresh
 * folder, PGlite, and a real PostgreSQL when CI provides one.
 */
export function storages<S>(
  onFile: (path: string) => S,
  onDatabase: (database: Database) => S,
): [string, () => Promise<OpenedStore<S>>][] {
  const file = async (): Promise<OpenedStore<S>> => {
    const dir = await mkdtemp(join(tmpdir(), "bgs-store-"));
    return {
      store: onFile(join(dir, "nested", "store.json")),
      close: () => rm(dir, { recursive: true, force: true }),
    };
  };
  const databases = testDatabases().map(([name, open]): [string, () => Promise<OpenedStore<S>>] => [
    name,
    async () => {
      const database = await open();
      await migrate(database);
      return { store: onDatabase(database), close: () => database.close() };
    },
  ]);
  return [["in a file", file], ...databases];
}
