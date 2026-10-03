import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { connectPostgres, type Database } from "../database";

const freshSchema = () => `test_${randomUUID().replaceAll("-", "")}`;

/** Started once per test file: PostgreSQL compiled to WebAssembly takes seconds to start. */
let pglite: Promise<PGlite> | null = null;

/** A fresh, empty schema of an in-memory PostgreSQL (WebAssembly), dropped when closed. */
export async function pgliteDatabase(): Promise<Database> {
  pglite ??= PGlite.create();
  const db = await pglite;
  const schema = freshSchema();
  // One connection, tests of a file one after the other: the schema stays the current one.
  await db.exec(`CREATE SCHEMA ${schema}; SET search_path TO ${schema}`);
  return {
    query: (text, params) => db.query(text, params),
    transaction: (work) =>
      db.transaction((tx) => work({ query: (text, params) => tx.query(text, params) })),
    onConnectionError() {
      // A single in-process connection: nothing to lose.
    },
    close: async () => {
      await db.exec(`DROP SCHEMA ${schema} CASCADE`);
    },
  };
}

/** A fresh schema of the real PostgreSQL at `url`, dropped when closed. */
async function realDatabase(url: string): Promise<Database> {
  const schema = freshSchema();
  const admin = connectPostgres(url);
  await admin.query(`CREATE SCHEMA ${schema}`);
  const withSchema = new URL(url);
  withSchema.searchParams.set("options", `-c search_path=${schema}`);
  const database = connectPostgres(withSchema.toString());
  return {
    ...database,
    async close() {
      await database.close();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.close();
    },
  };
}

/** The databases each test runs on: PGlite, and a real PostgreSQL when CI has one. */
export function testDatabases(): [string, () => Promise<Database>][] {
  const databases: [string, () => Promise<Database>][] = [["on PGlite", pgliteDatabase]];
  const url = process.env["DATABASE_URL"];
  if (url !== undefined) {
    databases.push(["on PostgreSQL", () => realDatabase(url)]);
  }
  return databases;
}
