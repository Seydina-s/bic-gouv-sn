import packageJson from "../package.json" with { type: "json" };
import { buildApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig(process.env);
const app = await buildApp({ config, version: packageJson.version });

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
