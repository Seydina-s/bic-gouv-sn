import packageJson from "../package.json" with { type: "json" };
import { FileArticleRepository } from "@bgs/content-store";
import { buildApp } from "./app";
import { loadConfig } from "./config";
import { ErrorJournal } from "./journal/error-journal";

const config = loadConfig(process.env);
/** The error journal is written at most this often, never on a request's path. */
const JOURNAL_FLUSH_MS = 30_000;
const errorJournal = await ErrorJournal.open(config.ERROR_JOURNAL_PATH);
const app = await buildApp({
  config,
  version: packageJson.version,
  articles: new FileArticleRepository(config.NEWS_STORE_PATH),
  errorJournal,
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
  app.close().then(
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
