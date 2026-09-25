// Loaded before the server with `node --import`: Sentry must start before Fastify is loaded
// so that requests are instrumented.
import packageJson from "../package.json" with { type: "json" };
import { loadConfig } from "./config";
import { initMonitoring } from "./monitoring";

initMonitoring(loadConfig(process.env), packageJson.version);
