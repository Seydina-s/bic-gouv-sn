// Headless Chrome driven over the DevTools protocol, with axe-core injected into
// each page (QA-06). No test framework: Chrome is already on the CI runners.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const AXE_SOURCE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
/** WCAG 2.0 to 2.2, levels A and AA (CLAUDE.md: WCAG 2.2 AA). */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const DEBUG_PORT = 9334;
const CHROME_PATHS: Partial<Record<NodeJS.Platform, string>> = {
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  linux: "google-chrome",
};

export interface Violation {
  rule: string;
  impact: string;
  help: string;
  /** A few offending elements, as CSS selectors. */
  targets: string[];
}

export interface Viewport {
  width: number;
  height: number;
  mobile: boolean;
}

interface CdpReply {
  id?: number;
  result?: { result?: { value?: unknown } };
  error?: { message: string };
}

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** A shared CI runner can be slow to start Chrome: up to 45 s before giving up. */
const START_TIMEOUT_MS = 45_000;
const START_ATTEMPTS = 2;

interface StartedChrome {
  process: ChildProcess;
  /** Its last error lines, to explain a failed start. */
  errors: () => string;
  exited: () => boolean;
}

function startChrome(executable: string): StartedChrome {
  const chrome = spawn(executable, [
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--no-first-run",
    // CI containers run as root without a user namespace for the sandbox.
    ...(process.env["CI"] === undefined ? [] : ["--no-sandbox"]),
    `--remote-debugging-port=${String(DEBUG_PORT)}`,
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "bgs-a11y-chrome-"))}`,
    "about:blank",
  ]);
  let stderr = "";
  let exited = false;
  chrome.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000);
  });
  chrome.on("exit", () => {
    exited = true;
  });
  chrome.on("error", (error) => {
    exited = true;
    stderr += String(error);
  });
  return { process: chrome, errors: () => stderr, exited: () => exited };
}

async function pageSocketUrl(chrome: StartedChrome): Promise<string> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline && !chrome.exited()) {
    try {
      const response = await fetch(`http://127.0.0.1:${String(DEBUG_PORT)}/json`);
      const targets = (await response.json()) as { type: string; webSocketDebuggerUrl: string }[];
      const page = targets.find((target) => target.type === "page");
      if (page !== undefined) {
        return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await wait(200);
  }
  throw new Error(`Chrome did not start. Its last messages:\n${chrome.errors()}`);
}

/** Starts Chrome, trying a second time if the first start fails. */
async function launchChrome(executable: string): Promise<{ chrome: ChildProcess; url: string }> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= START_ATTEMPTS; attempt += 1) {
    const chrome = startChrome(executable);
    try {
      return { chrome: chrome.process, url: await pageSocketUrl(chrome) };
    } catch (error) {
      lastError = error;
      chrome.process.kill();
      await wait(1000);
    }
  }
  throw lastError;
}

export class AuditBrowser {
  private nextId = 0;
  private readonly pending = new Map<number, (reply: CdpReply) => void>();

  private constructor(
    private readonly chrome: ChildProcess,
    private readonly socket: WebSocket,
  ) {
    socket.addEventListener("message", (event) => {
      const reply = JSON.parse(String(event.data)) as CdpReply;
      if (reply.id !== undefined) {
        this.pending.get(reply.id)?.(reply);
        this.pending.delete(reply.id);
      }
    });
  }

  static async launch(): Promise<AuditBrowser> {
    const executable = process.env["CHROME_PATH"] ?? CHROME_PATHS[process.platform];
    if (executable === undefined) {
      throw new Error("Set CHROME_PATH to a Chrome or Chromium executable");
    }
    const { chrome, url } = await launchChrome(executable);
    const socket = new WebSocket(url);
    await new Promise((resolve) => {
      socket.addEventListener("open", resolve, { once: true });
    });
    const browser = new AuditBrowser(chrome, socket);
    await browser.send("Page.enable");
    await browser.send("Network.enable");
    // axe is injected by the audit, not by the page: the console's strict CSP stays on.
    await browser.send("Page.setBypassCSP", { enabled: true });
    return browser;
  }

  private send(method: string, params: Record<string, unknown> = {}): Promise<CdpReply> {
    this.nextId += 1;
    const id = this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, (reply) => {
        if (reply.error === undefined) {
          resolve(reply);
        } else {
          reject(new Error(`${method}: ${reply.error.message}`));
        }
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  private async evaluate(expression: string): Promise<unknown> {
    const reply = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return reply.result?.result?.value;
  }

  async setViewport({ width, height, mobile }: Viewport): Promise<void> {
    await this.send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
  }

  async setScheme(scheme: "light" | "dark"): Promise<void> {
    await this.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
  }

  async setCookie(name: string, value: string, url: string): Promise<void> {
    await this.send("Network.setCookie", { name, value, url, httpOnly: true, secure: true });
  }

  /** Opens the page and lets it load its data and settle. */
  async open(url: string, settleMs: number): Promise<void> {
    await this.send("Page.navigate", { url });
    await wait(settleMs);
  }

  /** Runs a statement in the page (e.g. to write local storage). */
  async run(statement: string): Promise<void> {
    await this.evaluate(`(() => { ${statement} })()`);
  }

  /** Where the page ended up and how much text it shows: proof the screen really rendered. */
  async rendered(): Promise<{ path: string; characters: number; lang: string }> {
    const state = await this.evaluate(
      "({ path: location.pathname, characters: document.body.innerText.trim().length, lang: document.documentElement.lang })",
    );
    return state as { path: string; characters: number; lang: string };
  }

  /** WCAG A/AA rules axe finds broken on the open page. */
  async audit(): Promise<Violation[]> {
    await this.evaluate(AXE_SOURCE);
    const found = await this.evaluate(
      `axe.run(document, { runOnly: { type: "tag", values: ${JSON.stringify(WCAG_TAGS)} } })
        .then((result) => result.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact ?? "unknown",
          help: violation.help,
          targets: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
        })))`,
    );
    if (!Array.isArray(found)) {
      throw new Error("axe did not run on the page");
    }
    return found as Violation[];
  }

  close(): void {
    this.socket.close();
    this.chrome.kill();
  }
}
