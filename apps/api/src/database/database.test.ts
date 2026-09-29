import { afterEach, describe, expect, it } from "vitest";
import { testDatabases } from "../testing/database";
import type { Database } from "./database";
import { migrate } from "./database";
import { MIGRATIONS } from "./migrations";

let opened: Database[] = [];

afterEach(async () => {
  for (const database of opened) {
    await database.close();
  }
  opened = [];
});

describe.each(testDatabases())("the database %s (SCALE-02)", (_name, open) => {
  const fresh = async () => {
    const database = await open();
    opened.push(database);
    return database;
  };

  it("applies each migration once, in order, however often the API starts", async () => {
    const database = await fresh();
    expect(await migrate(database)).toEqual(MIGRATIONS.map(({ id }) => id));
    expect(await migrate(database)).toEqual([]);
    const { rows } = await database.query("SELECT id FROM schema_migrations ORDER BY id");
    expect(rows).toEqual(MIGRATIONS.map(({ id }) => ({ id })));
  });

  it("keeps nothing of a transaction that failed", async () => {
    const database = await fresh();
    await database.query("CREATE TABLE sample (value int)");
    await expect(
      database.transaction(async (tx) => {
        await tx.query("INSERT INTO sample VALUES ($1)", [1]);
        throw new Error("stopped halfway");
      }),
    ).rejects.toThrow("stopped halfway");
    expect((await database.query("SELECT * FROM sample")).rows).toEqual([]);
  });
});
