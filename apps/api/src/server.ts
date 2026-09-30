import packageJson from "../package.json" with { type: "json" };
import { FileArticleRepository } from "@bgs/content-store";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { connectPostgres, type Database, migrate } from "./database/database";
import { ErrorJournal } from "./journal/error-journal";
import { FileErrorJournalStore, PostgresErrorJournalStore } from "./journal/error-journal-store";
import { FileSearchMissStore, PostgresSearchMissStore } from "./journal/search-miss-store";
import { SearchMisses } from "./journal/search-misses";
import { UsageStats } from "./usage/usage-stats";
import { FileUsageStore, PostgresUsageStore } from "./usage/usage-store";

const config = loadConfig(process.env);
/** The error journal is written at most this often, never on a request's path. */
const JOURNAL_FLUSH_MS = 30_000;
/** PostgreSQL when configured (SCALE-02), its schema brought up to date first. */
async function openDatabase(url: string | undefined): Promise<Database | null> {
  if (url === undefined) {
    return null;
  }
  const database = connectPostgres(url);
  await migrate(database);
  return database;
}
const database = await openDatabase(config.DATABASE_URL);
const errorJournal = new ErrorJournal(
  database === null
    ? new FileErrorJournalStore(config.ERROR_JOURNAL_PATH)
    : new PostgresErrorJournalStore(database),
);
const searchMisses = new SearchMisses(
  database === null
    ? new FileSearchMissStore(config.SEARCH_MISSES_PATH)
    : new PostgresSearchMissStore(database),
);
const usageStats = new UsageStats(
  database === null
    ? new FileUsageStore(config.USAGE_STATS_PATH)
    : new PostgresUsageStore(database),
);
const app = await buildApp({
  config,
  version: packageJson.version,
  articles: new FileArticleRepository(config.NEWS_STORE_PATH),
  errorJournal,
  searchMisses,
  usageStats,
});
database?.onConnectionError((error) => {
  app.log.warn({ err: error }, "A database connection was lost");
});
usageStats.start(JOURNAL_FLUSH_MS, (error) => {
  app.log.error({ err: error }, "Usage counters could not be written");
});
searchMisses.start(JOURNAL_FLUSH_MS, (error) => {
  app.log.error({ err: error }, "Search misses could not be written");
});
errorJournal.start(JOURNAL_FLUSH_MS, (error) => {
  app.log.error({ err: error }, "Error journal could not be written");
});

/** Graceful shutdown: stop accepting requests, finish in-flight ones, then exit. */
function shutdown(signal: NodeJS.Signals): void {
  app.log.info({ signal }, "Shutting down");
  const forceExit = setTimeout(() => {
    app.log.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();
  app
    .close()
    // The counters are saved while the app closes, before the database goes.
    .then(() => database?.close())
    .then(
      () => process.exit(0),
      (error: unknown) => {
        app.log.error({ err: error }, "Error during shutdown");
        process.exit(1);
      },
    );
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

await app.listen({ host: config.HOST, port: config.PORT });

/**
 * The first search prepares every text (about 1.5 s); done here, right after start,
 * so no one waits for it. Common words: these warm-up searches find something and
 * are never counted as searches without result.
 */
const WARM_UP = [
  "/v1/news/search?q=conseil",
  "/v1/news/search?q=conseil&lang=wo",
  "/v1/procedures?q=acte",
];
for (const url of WARM_UP) {
  await app.inject({ method: "GET", url }).catch((error: unknown) => {
    app.log.warn({ err: error, url }, "Search warm-up failed");
  });
}
