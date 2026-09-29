// The whole product started for browser tests (accessibility audit, end-to-end
// journeys): the built API on placeholder data in a throwaway folder, the built
// console, and the app's web export served as a CDN would. Nothing touches .data/.
//   pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build
//   pnpm --filter @bgs/mobile export:web
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { seed, signIn, verifyService } from "./test-seed";

const repo = fileURLToPath(new URL("..", import.meta.url));
const webExport = join(repo, "apps", "mobile", "build", "web");
// Ports apart from the development servers (3000, 3001, 3100, 8081…).
const API_PORT = 3190;
const CONSOLE_PORT = 3191;
const APP_PORT = 3192;

function startApi(dataDir: string): ChildProcess {
  const data = (name: string) => join(dataDir, name);
  return spawn(process.execPath, ["dist/server.mjs"], {
    cwd: join(repo, "apps", "api"),
    stdio: ["ignore", "ignore", "inherit"],
    env: {
      ...process.env,
      HOST: "127.0.0.1",
      PORT: String(API_PORT),
      LOG_LEVEL: "error",
      ADMIN_SECRET_KEY: randomBytes(32).toString("base64"),
      NEWS_STORE_PATH: data("news.json"),
      PROCEDURES_STORE_PATH: data("procedures.json"),
      PROCEDURE_THEMES_PATH: data("procedure-themes.json"),
      MAP_TILES_PATH: data("senegal.pmtiles"),
      MAP_ASSETS_ROOT: data("map"),
      STATE_SERVICES_PATH: data("state-services.json"),
      REMOTE_CONFIG_PATH: data("remote-config.json"),
      ERROR_JOURNAL_PATH: data("error-journal.json"),
      SEARCH_MISSES_PATH: data("search-misses.json"),
      USAGE_STATS_PATH: data("usage-stats.json"),
      INGESTION_STATUS_PATH: data("ingestion-status.json"),
      MEDIA_ROOT: data("media"),
      ADMIN_ACCOUNTS_PATH: data("admin/accounts.json"),
      ADMIN_AUDIT_PATH: data("admin/audit.jsonl"),
      NOTIFICATIONS_PATH: data("admin/notifications.json"),
    },
  });
}

function startConsole(): ChildProcess {
  const next = createRequire(join(repo, "apps", "admin", "package.json")).resolve(
    "next/dist/bin/next",
  );
  return spawn(process.execPath, [next, "start", "--port", String(CONSOLE_PORT)], {
    cwd: join(repo, "apps", "admin"),
    stdio: ["ignore", "ignore", "inherit"],
    env: { ...process.env, API_URL: `http://127.0.0.1:${String(API_PORT)}` },
  });
}

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

/** The web export, with API calls relayed on the same origin (as a CDN would). */
function serveApp(): Server {
  const server = createServer((req, res) => {
    const url = req.url ?? "/";
    if (/^\/(v1|media)\//.test(url)) {
      const upstream = request(
        { host: "127.0.0.1", port: API_PORT, path: url, method: req.method, headers: req.headers },
        (reply) => {
          res.writeHead(reply.statusCode ?? 502, reply.headers);
          reply.pipe(res);
        },
      );
      upstream.on("error", () => res.writeHead(502).end());
      req.pipe(upstream);
      return;
    }
    const path = normalize(decodeURIComponent(url.split("?")[0] ?? "/")).replace(/^[\\/]+/, "");
    // Every route falls back to the single page of the export.
    for (const file of [
      join(webExport, path),
      join(webExport, `${path}.html`),
      join(webExport, "index.html"),
    ]) {
      try {
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
        res.end(body);
        return;
      } catch {
        // Not this candidate.
      }
    }
    res.writeHead(404).end();
  });
  server.listen(APP_PORT, "127.0.0.1");
  return server;
}

async function waitUntilUp(url: string): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error(`${url} did not answer`);
}

export interface TestStack {
  /** The app's web export (API relayed on the same origin). */
  appBase: string;
  /** The console, on "localhost": its Secure session cookie is allowed there over http. */
  consoleBase: string;
  /** A session of the placeholder administrator, for the console. */
  token: string;
  stop: () => void;
}

/** Starts everything on fresh placeholder data; stop() removes it all. */
export async function startStack(): Promise<TestStack> {
  const dataDir = mkdtempSync(join(tmpdir(), "bgs-test-data-"));
  const password = randomBytes(24).toString("base64url");
  await seed(dataDir, password);
  const api = startApi(dataDir);
  const admin = startConsole();
  const app = serveApp();
  const stop = () => {
    app.close();
    api.kill();
    admin.kill();
    rmSync(dataDir, { recursive: true, force: true });
  };
  try {
    const apiBase = `http://127.0.0.1:${String(API_PORT)}`;
    await waitUntilUp(`${apiBase}/v1/health`);
    await waitUntilUp(`http://127.0.0.1:${String(CONSOLE_PORT)}/connexion`);
    const token = await signIn(apiBase, password);
    await verifyService(apiBase, token);
    return {
      appBase: `http://localhost:${String(APP_PORT)}`,
      consoleBase: `http://localhost:${String(CONSOLE_PORT)}`,
      token,
      stop,
    };
  } catch (error) {
    stop();
    throw error;
  }
}
