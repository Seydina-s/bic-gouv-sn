// Accessibility audit (QA-06, QA-07): axe-core's WCAG 2.2 A/AA rules on every
// screen of the app (web export) and of the console, light and dark, with
// placeholder data in a throwaway folder (test-seed.ts). Any broken rule fails.
//   pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build
//   pnpm --filter @bgs/mobile export:web
//   pnpm a11y
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARTICLE_ID, PROCEDURE_SLUG, SERVICE_ID } from "./test-seed";
import { TestBrowser, type Viewport, type Violation } from "./test-browser";
import { startStack } from "./test-stack";

const SETTLE_MS = Number(process.env["A11Y_SETTLE_MS"] ?? 4000);
/** A folder to keep a picture of every audited screen (visual check); none by default. */
const SHOTS_DIR = process.env["A11Y_SHOTS"];
const PHONE: Viewport = { width: 412, height: 915, mobile: true };
const DESKTOP: Viewport = { width: 1280, height: 900, mobile: false };
const SCHEMES = ["light", "dark"] as const;
/** The interface is French until the Wolof catalog is complete (W-01). */
const INTERFACE_LANG = "fr";

const APP_SCREENS = [
  "/",
  "/section/communiques",
  `/article/${ARTICLE_ID}`,
  "/search",
  "/favorites",
  "/procedures",
  `/procedure/${PROCEDURE_SLUG}`,
  "/near-me",
  `/service/${SERVICE_ID}`,
  "/assistant",
  "/participate",
  "/licences",
];
const CONSOLE_SCREENS = [
  "/",
  "/erreurs",
  "/controle",
  "/demarches",
  "/services",
  `/services/${SERVICE_ID}`,
  "/services/nouveau",
  "/masques",
  "/recherches",
  "/journal",
  "/notifications",
  "/comptes",
];

interface ScreenReport {
  screen: string;
  scheme: string;
  violations: Violation[];
}

async function auditScreens(
  browser: TestBrowser,
  base: string,
  screens: readonly string[],
  scheme: (typeof SCHEMES)[number],
): Promise<ScreenReport[]> {
  const reports: ScreenReport[] = [];
  await browser.setScheme(scheme);
  for (const screen of screens) {
    await browser.open(base + screen, SETTLE_MS);
    // An empty page or a redirect (e.g. to the sign-in) would pass axe unaudited.
    const { path, characters, lang } = await browser.rendered();
    if (path !== screen || characters === 0) {
      throw new Error(
        `${base}${screen} did not render (at ${path}, ${String(characters)} characters)`,
      );
    }
    const violations = await browser.audit();
    // axe only checks that a language is declared, not that it is the right one.
    if (lang !== INTERFACE_LANG) {
      violations.push({
        rule: "interface-language",
        impact: "serious",
        help: `The page declares "${lang}" but its interface is in "${INTERFACE_LANG}" (WCAG 3.1.1)`,
        targets: ["html"],
      });
    }
    reports.push({ screen: base + screen, scheme, violations });
    if (SHOTS_DIR !== undefined) {
      const name = `${new URL(base).port}${screen.replaceAll("/", "_")}-${scheme}.png`;
      writeFileSync(join(SHOTS_DIR, name), await browser.screenshot());
    }
  }
  return reports;
}

async function main(): Promise<number> {
  const stack = await startStack();
  let browser: TestBrowser | null = null;
  try {
    browser = await TestBrowser.launch();
    const { appBase, consoleBase, token } = stack;
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
      reports.push(
        ...(await auditScreens(browser, consoleBase, ["/connexion", "/connexion/activer"], scheme)),
      );
    }
    await browser.setCookie("bgs_admin_session", token, consoleBase);
    for (const scheme of SCHEMES) {
      reports.push(...(await auditScreens(browser, consoleBase, CONSOLE_SCREENS, scheme)));
    }
    return report(reports);
  } finally {
    browser?.close();
    stack.stop();
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
