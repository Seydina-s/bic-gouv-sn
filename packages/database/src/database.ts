import pg from "pg";
import { MIGRATIONS } from "./migrations";

/** What the stores need of PostgreSQL: parameterized queries, never string-built SQL. */
export interface Queryable {
  query(text: string, params?: unknown[]): Promise<{ rows: unknown[] }>;
}

export interface Database extends Queryable {
  /** Runs `work` in one transaction on one connection: all of it, or nothing. */
  transaction<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
  /** Hears about a lost idle connection (the pool replaces it by itself). */
  onConnectionError(listener: (error: Error) => void): void;
  close(): Promise<void>;
}

/** Every statement is cut short after this: a slow database never holds a request. */
const STATEMENT_TIMEOUT_MS = 5_000;

/** A pool of connections to PostgreSQL (SCALE-02); the URL comes from the secret manager. */
export function connectPostgres(url: string): Database {
  const pool = new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS + 1_000,
  });
  const listeners: ((error: Error) => void)[] = [];
  // Always listened to: an unheard pool error would stop the whole API.
  pool.on("error", (error) => {
    for (const listener of listeners) {
      listener(error);
    }
  });
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await work({ query: (text, params) => client.query(text, params) });
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    onConnectionError(listener) {
      listeners.push(listener);
    },
    close: () => pool.end(),
  };
}

/** Any number: instances starting together take turns applying the migrations. */
const MIGRATION_LOCK = 20_260_929;

/** Applies, in order and once each, the migrations the database has not seen yet. */
export async function migrate(database: Database): Promise<string[]> {
  return database.transaction(async (tx) => {
    await tx.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK]);
    await tx.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`,
    );
    const { rows } = await tx.query("SELECT id FROM schema_migrations");
    const done = new Set(rows.map((row) => (row as { id: string }).id));
    const applied: string[] = [];
    for (const migration of MIGRATIONS.filter(({ id }) => !done.has(id))) {
      for (const statement of migration.statements) {
        await tx.query(statement);
      }
      await tx.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
      applied.push(migration.id);
    }
    return applied;
  });
}

/** PostgreSQL when a URL is set (SCALE-02), its schema brought up to date first. */
export async function openDatabase(url: string | undefined): Promise<Database | null> {
  if (url === undefined) {
    return null;
  }
  const database = connectPostgres(url);
  try {
    await migrate(database);
  } catch (error) {
    await database.close();
    throw error;
  }
  return database;
}
