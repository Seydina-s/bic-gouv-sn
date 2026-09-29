// Headless Chrome driven over the DevTools protocol, for the accessibility audit
// (axe-core injected into each page, QA-06) and the end-to-end journeys (a few
// plain gestures). No test framework: Chrome is already on the CI runners.
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
  result?: { result?: { value?: unknown }; data?: string };
  error?: { message: string };
  /** Events the page sends by itself (errors, console messages). */
  method?: string;
  params?: {
    type?: string;
    args?: { value?: unknown; description?: string }[];
    exceptionDetails?: { text?: string; exception?: { description?: string } };
  };
}

/** A page error or console error, in one short line. */
function pageError(message: CdpReply): string | null {
  if (message.method === "Runtime.exceptionThrown") {
    const details = message.params?.exceptionDetails;
    return (details?.exception?.description ?? details?.text ?? "exception").slice(0, 400);
  }
  if (message.method === "Runtime.consoleAPICalled" && message.params?.type === "error") {
    const args = message.params.args ?? [];
    return args
      .map((arg) =>
        typeof arg.value === "string" ? arg.value : (arg.description ?? JSON.stringify(arg.value)),
      )
      .join(" ")
      .slice(0, 400);
  }
  return null;
}

const wait = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** How long a page may take to load before the test goes on anyway. */
const LOAD_TIMEOUT_MS = 30_000;

/** How long a gesture waits for its target to appear (a slow CI runner included). */
const GESTURE_TIMEOUT_MS = 15_000;

/**
 * Page function finding a visible control by its accessible name: the exact name
 * first, then a name that starts with it (a row's label adds its details), then
 * one that contains it (a card's label starts with its section).
 */
const FIND_CONTROL = `((name) => {
  const shown = (element) => {
    const box = element.getBoundingClientRect();
    return box.width > 0 && box.height > 0;
  };
  const nameOf = (element) =>
    (element.getAttribute("aria-label") ?? element.innerText ?? "").replace(/\\s+/g, " ").trim();
  const controls = [
    ...document.querySelectorAll(
      'button, a, [role="button"], [role="link"], [role="tab"], [role="checkbox"], [role="radio"]',
    ),
  ].filter(shown);
  return (
    controls.find((element) => nameOf(element) === name) ??
    controls.find((element) => nameOf(element).startsWith(name)) ??
    controls.find((element) => nameOf(element).includes(name)) ??
    null
  );
})`;

/** Page function finding a visible text field by its label, accessible name or placeholder. */
const FIND_FIELD = `((label) => {
  const labelled = (field) =>
    field.getAttribute("aria-label") === label ||
    field.getAttribute("placeholder") === label ||
    (field.labels !== null &&
      [...field.labels].some((element) => element.innerText.trim().startsWith(label)));
  return (
    [...document.querySelectorAll("input, textarea")].find(
      (field) => field.getBoundingClientRect().width > 0 && labelled(field),
    ) ?? null
  );
})`;

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
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "bgs-test-chrome-"))}`,
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

export class TestBrowser {
  private nextId = 0;
  private readonly pending = new Map<number, (reply: CdpReply) => void>();
  private readonly errors: string[] = [];
  /** Pages fully loaded so far (Page.loadEventFired). */
  private loads = 0;

  private constructor(
    private readonly chrome: ChildProcess,
    private readonly socket: WebSocket,
  ) {
    socket.addEventListener("message", (event) => {
      const reply = JSON.parse(String(event.data)) as CdpReply;
      if (reply.id !== undefined) {
        this.pending.get(reply.id)?.(reply);
        this.pending.delete(reply.id);
        return;
      }
      if (reply.method === "Page.loadEventFired") {
        this.loads += 1;
      }
      const error = pageError(reply);
      if (error !== null) {
        this.errors.push(error);
      }
    });
  }

  /** Errors the pages reported since the last call (to explain a failed journey). */
  takeErrors(): string[] {
    return this.errors.splice(0);
  }

  static async launch(): Promise<TestBrowser> {
    const executable = process.env["CHROME_PATH"] ?? CHROME_PATHS[process.platform];
    if (executable === undefined) {
      throw new Error("Set CHROME_PATH to a Chrome or Chromium executable");
    }
    const { chrome, url } = await launchChrome(executable);
    const socket = new WebSocket(url);
    await new Promise((resolve) => {
      socket.addEventListener("open", resolve, { once: true });
    });
    const browser = new TestBrowser(chrome, socket);
    await browser.send("Page.enable");
    await browser.send("Runtime.enable");
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

  /** The whole page as a PNG, beyond the visible part (for a visual check). */
  async screenshot(): Promise<Buffer> {
    const reply = await this.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    return Buffer.from(reply.result?.data ?? "", "base64");
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
    const before = this.loads;
    await this.send("Page.navigate", { url });
    // A gesture made before the page has loaded would act on the previous one.
    const deadline = Date.now() + LOAD_TIMEOUT_MS;
    while (this.loads === before && Date.now() < deadline) {
      await wait(50);
    }
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

  /** Waits until a condition written in the page's JavaScript holds; false on timeout. */
  async waitUntil(condition: string, timeoutMs = GESTURE_TIMEOUT_MS): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if ((await this.evaluate(`Boolean(${condition})`)) === true) {
        return true;
      }
      await wait(150);
    }
    return false;
  }

  /** Waits for a text anywhere on the screen, as a person would look for it. */
  async waitForText(text: string, timeoutMs = GESTURE_TIMEOUT_MS): Promise<void> {
    const found = await this.waitUntil(
      `document.body.innerText.includes(${JSON.stringify(text)})`,
      timeoutMs,
    );
    if (!found) {
      throw new Error(`« ${text} » n'apparaît pas à l'écran`);
    }
  }

  /** Waits until the address shows this path (a screen was opened). */
  async waitForPath(path: string): Promise<void> {
    if (!(await this.waitUntil(`location.pathname === ${JSON.stringify(path)}`))) {
      throw new Error(`L'écran ${path} ne s'est pas ouvert (resté sur ${await this.path()})`);
    }
  }

  async path(): Promise<string> {
    return String(await this.evaluate("location.pathname"));
  }

  /** Presses the button, link or choice with this accessible name, like a finger would. */
  async press(name: string): Promise<void> {
    const point = await this.locate(`${FIND_CONTROL}(${JSON.stringify(name)})`, name);
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
      await this.send("Input.dispatchMouseEvent", {
        type,
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
    }
  }

  /** Waits for a control with this accessible name, without pressing it. */
  async waitForControl(name: string): Promise<void> {
    await this.locate(`${FIND_CONTROL}(${JSON.stringify(name)})`, name);
  }

  /** What the field with this label holds (e.g. a link shown to be copied). */
  async fieldValue(label: string): Promise<string> {
    await this.locate(`${FIND_FIELD}(${JSON.stringify(label)})`, label);
    return String(await this.evaluate(`${FIND_FIELD}(${JSON.stringify(label)}).value`));
  }

  /**
   * Records the addresses the page opens elsewhere (window.open) instead of opening
   * them: an official source or a navigation app stays one step outside the test.
   */
  async catchOpenedLinks(): Promise<void> {
    await this.run(
      "window.bgsOpened = []; window.open = (url) => { window.bgsOpened.push(String(url)); return null; };",
    );
  }

  /** Waits until the page asked to open an address containing this text. */
  async waitForOpened(fragment: string): Promise<void> {
    const opened = await this.waitUntil(
      `(window.bgsOpened ?? []).some((url) => url.includes(${JSON.stringify(fragment)}))`,
    );
    if (!opened) {
      throw new Error(`Aucune adresse contenant « ${fragment} » n'a été ouverte`);
    }
  }

  /** Types into the field with this label (or placeholder), key by key. */
  async type(label: string, text: string): Promise<void> {
    await this.locate(`${FIND_FIELD}(${JSON.stringify(label)})`, label, true);
    await this.send("Input.insertText", { text });
  }

  /** The centre of an element found by a page function, scrolled into view (and focused). */
  private async locate(
    find: string,
    name: string,
    focus = false,
  ): Promise<{ x: number; y: number }> {
    if (!(await this.waitUntil(find))) {
      throw new Error(`Rien à l'écran ne s'appelle « ${name} »`);
    }
    const point = await this.evaluate(`(() => {
      const element = ${find};
      element.scrollIntoView({ block: "center" });
      ${focus ? "element.focus();" : ""}
      const box = element.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    })()`);
    return point as { x: number; y: number };
  }

  close(): void {
    this.socket.close();
    this.chrome.kill();
  }
}
