// Accessibility audit (QA-06): axe-core's WCAG 2.2 A/AA rules on every screen of
// the app (web export) and of the console, light and dark, with placeholder data
// in a throwaway folder. Any broken rule fails the run.
//   pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build
//   pnpm --filter @bgs/mobile export:web
//   pnpm a11y
import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { base32Decode, codeAt, hashPassword, timeStep } from "../packages/admin-auth/src/index";
import { FileArticleRepository } from "../packages/content-store/src/index";
import { AuditBrowser, type Viewport, type Violation } from "./a11y-browser";

const repo = fileURLToPath(new URL("..", import.meta.url));
const webExport = join(repo, "apps", "mobile", "build", "web");
// Ports apart from the development servers (3000, 3001, 3100, 8081…).
const API_PORT = 3190;
const CONSOLE_PORT = 3191;
const APP_PORT = 3192;
const SETTLE_MS = Number(process.env["A11Y_SETTLE_MS"] ?? 4000);
const PHONE: Viewport = { width: 412, height: 915, mobile: true };
const DESKTOP: Viewport = { width: 1280, height: 900, mobile: false };
const SCHEMES = ["light", "dark"] as const;

// Placeholder content for the audit only: never published, deleted afterwards.
const ARTICLE_ID = "00000000-0000-5000-8000-00000000a11e";
const ACCOUNT_EMAIL = "audit-accessibilite@bic.test";

const APP_SCREENS = [
  "/",
  "/section/communiques",
  `/article/${ARTICLE_ID}`,
  "/search",
  "/favorites",
  "/procedures",
  "/near-me",
  "/assistant",
  "/participate",
  "/licences",
];
const CONSOLE_SCREENS = ["/", "/erreurs", "/controle", "/demarches", "/services"];

async function seedArticle(storePath: string): Promise<void> {
  const sourceUrl = "https://www.presidence.sn/fr/actualites/audit-accessibilite/";
  await new FileArticleRepository(storePath).save({
    id: ARTICLE_ID,
    kind: "news-article",
    category: "communiques",
    sourceUrl,
    sourcePublishedOn: "2026-09-28",
    sourceUpdatedAt: "2026-09-28T08:00:00Z",
    fetchedAt: "2026-09-28T08:01:00Z",
    contentHash: "a".repeat(64),
    version: 1,
    lang: "fr",
    translations: [
      {
        lang: "fr",
        status: "official",
        title: "Article fictif pour l'audit d'accessibilité",
        bodyHtml:
          '<p>Texte fictif, avec un <a href="https://www.presidence.sn/fr/">lien</a>.</p>' +
          "<h2>Intertitre</h2><ul><li>Premier point</li><li>Second point</li></ul>",
        sourceUrl,
      },
    ],
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  });
}

/** A console account known only to this run; the password never leaves memory. */
async function seedAccount(accountsPath: string, password: string): Promise<void> {
  const account = {
    id: randomUUID(),
    email: ACCOUNT_EMAIL,
    name: "Audit d'accessibilité",
    role: "admin",
    passwordHash: await hashPassword(password),
    totp: { sealedSecret: null, enrolledAt: null, lastStep: null },
    attempts: { failures: [], lockedUntil: null },
    disabled: false,
    createdAt: new Date().toISOString(),
  };
  writeFileSync(accountsPath, JSON.stringify({ schemaVersion: 1, accounts: [account] }));
}

/** Signs in through the real API (password, then a computed code): a session token. */
async function signIn(password: string): Promise<string> {
  const post = async (step: string, body: unknown) => {
    const response = await fetch(`http://127.0.0.1:${String(API_PORT)}/admin/v1/auth/${step}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await response.json()) as Record<string, string | undefined>;
  };
  const first = await post("password", { email: ACCOUNT_EMAIL, password });
  const secret = base32Decode(first["secret"] ?? "");
  if (secret === null) {
    throw new Error("The sign-in did not offer a second factor to set up");
  }
  const second = await post("code", {
    challenge: first["challenge"],
    code: codeAt(secret, timeStep(Date.now())),
  });
  const token = second["token"];
  if (token === undefined) {
    throw new Error("The sign-in did not return a session");
  }
  return token;
}

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
      INGESTION_STATUS_PATH: data("ingestion-status.json"),
      MEDIA_ROOT: data("media"),
      ADMIN_ACCOUNTS_PATH: data("admin/accounts.json"),
      ADMIN_AUDIT_PATH: data("admin/audit.jsonl"),
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

interface ScreenReport {
  screen: string;
  scheme: string;
  violations: Violation[];
}

async function auditScreens(
  browser: AuditBrowser,
  base: string,
  screens: readonly string[],
  scheme: (typeof SCHEMES)[number],
): Promise<ScreenReport[]> {
  const reports: ScreenReport[] = [];
  await browser.setScheme(scheme);
  for (const screen of screens) {
    await browser.open(base + screen, SETTLE_MS);
    // An empty page or a redirect (e.g. to the sign-in) would pass axe unaudited.
    const { path, characters } = await browser.rendered();
    if (path !== screen || characters === 0) {
      throw new Error(
        `${base}${screen} did not render (at ${path}, ${String(characters)} characters)`,
      );
    }
    reports.push({ screen: base + screen, scheme, violations: await browser.audit() });
  }
  return reports;
}

async function main(): Promise<number> {
  const dataDir = mkdtempSync(join(tmpdir(), "bgs-a11y-data-"));
  mkdirSync(join(dataDir, "admin"));
  const password = randomBytes(24).toString("base64url");
  await seedArticle(join(dataDir, "news.json"));
  await seedAccount(join(dataDir, "admin", "accounts.json"), password);

  const api = startApi(dataDir);
  const admin = startConsole();
  const app = serveApp();
  let browser: AuditBrowser | null = null;
  try {
    await waitUntilUp(`http://127.0.0.1:${String(API_PORT)}/v1/health`);
    await waitUntilUp(`http://127.0.0.1:${String(CONSOLE_PORT)}/connexion`);
    const token = await signIn(password);
    browser = await AuditBrowser.launch();
    const appBase = `http://localhost:${String(APP_PORT)}`;
    // Console on "localhost": its session cookie is Secure, allowed there over http.
    const consoleBase = `http://localhost:${String(CONSOLE_PORT)}`;
    const reports: ScreenReport[] = [];
    await browser.setViewport(PHONE);
    for (const scheme of SCHEMES) {
      // First visit: the welcome screens; then the app itself.
      await browser.open(appBase, SETTLE_MS);
      await browser.run('localStorage.removeItem("bgs-onboarding")');
      reports.push(...(await auditScreens(browser, appBase, ["/"], scheme)));
      await browser.run('localStorage.setItem("bgs-onboarding", "done")');
      reports.push(...(await auditScreens(browser, appBase, APP_SCREENS, scheme)));
    }
    await browser.setViewport(DESKTOP);
    // Signed out first: once signed in, the sign-in page leads to the console.
    for (const scheme of SCHEMES) {
      reports.push(...(await auditScreens(browser, consoleBase, ["/connexion"], scheme)));
    }
    await browser.setCookie("bgs_admin_session", token, consoleBase);
    for (const scheme of SCHEMES) {
      reports.push(...(await auditScreens(browser, consoleBase, CONSOLE_SCREENS, scheme)));
    }
    return report(reports);
  } finally {
    browser?.close();
    app.close();
    api.kill();
    admin.kill();
    rmSync(dataDir, { recursive: true, force: true });
  }
}

const say = (line: string) => process.stdout.write(`${line}\n`);

/** Plain summary: which screen, which theme, which rule, where. Returns the exit code. */
function report(reports: readonly ScreenReport[]): number {
  const failing = reports.filter((entry) => entry.violations.length > 0);
  for (const { screen, scheme, violations } of failing) {
    say(`\n✗ ${screen} (${scheme === "dark" ? "sombre" : "clair"})`);
    for (const violation of violations) {
      say(`  - [${violation.impact}] ${violation.rule} : ${violation.help}`);
      for (const target of violation.targets) {
        say(`      ${target}`);
      }
    }
  }
  const clean = reports.length - failing.length;
  say(
    `\n${String(clean)}/${String(reports.length)} écrans sans défaut d'accessibilité (WCAG 2.2 A/AA, axe-core).`,
  );
  return failing.length === 0 ? 0 : 1;
}

void main().then((code) => {
  process.exitCode = code;
});
