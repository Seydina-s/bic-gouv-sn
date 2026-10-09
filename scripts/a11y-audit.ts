// Accessibility audit (QA-06, QA-07): axe-core's WCAG 2.2 A/AA rules on every
// screen of the app (web export) and of the console, light and dark, with
// placeholder data in a throwaway folder (test-seed.ts). Any broken rule fails.
//   pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build
//   pnpm --filter @bgs/mobile export:web
//   pnpm a11y
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ARTICLE_ID, OPPORTUNITY_ID, PROCEDURE_SLUG, SERVICE_ID } from "./test-seed";
import { TestBrowser, type Viewport, type Violation } from "./test-browser";
import { startStack } from "./test-stack";

/** Once a screen shows its content: time for images, fonts and entrances to finish. */
const SETTLE_MS = Number(process.env["A11Y_SETTLE_MS"] ?? 1000);
/** Longest wait for a screen to show its content. */
const CONTENT_TIMEOUT_MS = 20_000;
/** Time for a step of the welcome to finish coming in. */
const STEP_SETTLE_MS = 1500;
/** A folder to keep a picture of every audited screen (visual check); none by default. */
const SHOTS_DIR = process.env["A11Y_SHOTS"];
const PHONE: Viewport = { width: 412, height: 915, mobile: true };
const DESKTOP: Viewport = { width: 1280, height: 900, mobile: false };
/** The narrowest phones in use (WCAG 1.4.10 reflow width). */
const NARROW: Viewport = { width: 320, height: 640, mobile: true };
const SCHEMES = ["light", "dark"] as const;
/** The interface is French until the Wolof catalog is complete (W-01). */
const INTERFACE_LANG = "fr";
/** The title of each step of the welcome, in order (fr catalog). */
const WELCOME_STEPS = [
  "Choisissez votre langue",
  "Le Gouvernement, en un seul endroit",
  "La source, toujours",
  "Gardez l'essentiel, même sans réseau",
] as const;

/**
 * What proves a screen shows its content, not a skeleton nor an error: a heading
 * of the page (never the navigation's labels), or a placeholder of the seed.
 */
type Proof = { heading: string } | { text: string };
type Screen = readonly [path: string, proof: Proof];

const ARTICLE = { text: "Article fictif pour l'audit d'accessibilité" };
const APP_SCREENS: readonly Screen[] = [
  ["/", ARTICLE],
  ["/section/communiques", ARTICLE],
  [`/article/${ARTICLE_ID}`, ARTICLE],
  ["/search", { heading: "Rechercher" }],
  ["/favorites", { heading: "Mes favoris" }],
  ["/procedures", { heading: "Démarches" }],
  [`/procedure/${PROCEDURE_SLUG}`, { text: "Démarche de test" }],
  ["/near-me", { heading: "Près de moi" }],
  [`/service/${SERVICE_ID}`, { text: "Mairie fictive" }],
  // Not yet available: the screen's heading, then "Bientôt disponible".
  ["/assistant", { heading: "Assistant IA" }],
  ["/participate", { heading: "Participer" }],
  ["/licences", { heading: "Logiciels libres" }],
  ["/opportunities", { text: "Opportunité fictive pour les tests" }],
  [`/opportunity/${OPPORTUNITY_ID}`, { text: "Voir l'offre officielle" }],
];
const SIGN_IN_SCREENS: readonly Screen[] = [
  ["/connexion", { heading: "Connexion" }],
  ["/connexion/activer", { heading: "Activer votre compte" }],
];
const CONSOLE_SCREENS: readonly Screen[] = [
  ["/", { heading: "À traiter" }],
  ["/erreurs", { heading: "Journal des erreurs" }],
  ["/controle", { heading: "Contrôle à distance" }],
  ["/demarches", { heading: "Thèmes des démarches" }],
  ["/services", { heading: "Services de l'État" }],
  [`/services/${SERVICE_ID}`, { heading: "Corriger un service" }],
  ["/services/nouveau", { heading: "Ajouter un service de l'État" }],
  ["/masques", { heading: "Articles masqués" }],
  ["/recherches", { heading: "Recherches sans résultat" }],
  ["/usage", { heading: "Usage de l'application" }],
  ["/journal", { heading: "Journal d'audit" }],
  ["/notifications", { heading: "Notifications" }],
  ["/comptes", { heading: "Comptes" }],
  ["/opportunites", { heading: "Opportunités" }],
  ["/participation", { heading: "Participation" }],
];

/** Opens a screen and waits for its proof of content, then lets it settle. */
async function openScreen(browser: TestBrowser, base: string, [path, proof]: Screen) {
  await browser.open(base + path, 0);
  const condition =
    "heading" in proof
      ? `[...document.querySelectorAll("h1, h2, [role=heading]")].some((node) => node.innerText.includes(${JSON.stringify(proof.heading)}))`
      : `document.body.innerText.includes(${JSON.stringify(proof.text)})`;
  if (!(await browser.waitUntil(condition, CONTENT_TIMEOUT_MS))) {
    const expected = "heading" in proof ? proof.heading : proof.text;
    throw new Error(`${base}${path} never showed « ${expected} »`);
  }
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
}

interface ScreenReport {
  screen: string;
  scheme: string;
  violations: Violation[];
}

/** Each screen at 320 px wide: text cut by an edge is a failure (WCAG 1.4.10). */
async function reflowScreens(
  browser: TestBrowser,
  base: string,
  screens: readonly Screen[],
): Promise<ScreenReport[]> {
  const reports: ScreenReport[] = [];
  for (const screen of screens) {
    await openScreen(browser, base, screen);
    reports.push(reflowShown(base + screen[0], await browser.overflowingText()));
  }
  return reports;
}

function reflowShown(screen: string, cut: readonly string[]): ScreenReport {
  return {
    screen,
    scheme: "narrow",
    violations:
      cut.length === 0
        ? []
        : [
            {
              rule: "reflow-320",
              impact: "serious",
              help: "Texte coupé par le bord d'un écran de 320 px (WCAG 1.4.10)",
              targets: [...cut],
            },
          ],
  };
}

async function auditScreens(
  browser: TestBrowser,
  base: string,
  screens: readonly Screen[],
  scheme: (typeof SCHEMES)[number],
): Promise<ScreenReport[]> {
  const reports: ScreenReport[] = [];
  await browser.setScheme(scheme);
  for (const screen of screens) {
    await openScreen(browser, base, screen);
    reports.push(await auditShown(browser, base, screen[0], screen[0], scheme));
  }
  return reports;
}

/** Audits what is on screen now, expected at `path`; `name` tells it apart in the report. */
async function auditShown(
  browser: TestBrowser,
  base: string,
  path: string,
  name: string,
  scheme: (typeof SCHEMES)[number],
): Promise<ScreenReport> {
  // An empty page or a redirect (e.g. to the sign-in) would pass axe unaudited.
  const shown = await browser.rendered();
  if (shown.path !== path || shown.characters === 0) {
    throw new Error(
      `${base}${name} did not render (at ${shown.path}, ${String(shown.characters)} characters)`,
    );
  }
  const violations = await browser.audit();
  // axe only checks that a language is declared, not that it is the right one.
  if (shown.lang !== INTERFACE_LANG) {
    violations.push({
      rule: "interface-language",
      impact: "serious",
      help: `The page declares "${shown.lang}" but its interface is in "${INTERFACE_LANG}" (WCAG 3.1.1)`,
      targets: ["html"],
    });
  }
  if (SHOTS_DIR !== undefined) {
    const file = `${new URL(base).port}${name.replace(/[^\w-]+/g, "_")}-${scheme}.png`;
    writeFileSync(join(SHOTS_DIR, file), await browser.screenshot());
  }
  return { screen: base + name, scheme, violations };
}

/**
 * The welcome, from its first screen (the language) to its last step: each one
 * audited, then, at 320 px, read for text cut by an edge.
 */
async function auditWelcome(
  browser: TestBrowser,
  base: string,
  scheme: (typeof SCHEMES)[number] | "narrow",
): Promise<ScreenReport[]> {
  await browser.setScheme(scheme === "narrow" ? "light" : scheme);
  await browser.open(base, SETTLE_MS);
  await browser.run('localStorage.removeItem("bgs-onboarding")');
  await browser.open(base, 0);
  const reports: ScreenReport[] = [];
  for (const [index, title] of WELCOME_STEPS.entries()) {
    if (index > 0) {
      await browser.press("Suivant");
    }
    await browser.waitForText(title);
    // Each step comes in with a fade: colours read mid-way would be half-blended.
    await new Promise((resolve) => setTimeout(resolve, STEP_SETTLE_MS));
    const name = `/ (présentation, étape ${String(index + 1)})`;
    reports.push(
      scheme === "narrow"
        ? reflowShown(base + name, await browser.overflowingText())
        : await auditShown(browser, base, "/", name, scheme),
    );
  }
  await browser.run('localStorage.setItem("bgs-onboarding", "done")');
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
      // First visit: the welcome, step by step; then the app itself.
      reports.push(...(await auditWelcome(browser, appBase, scheme)));
      reports.push(...(await auditScreens(browser, appBase, APP_SCREENS, scheme)));
    }
    await browser.setViewport(DESKTOP);
    // Signed out first: once signed in, the sign-in page leads to the console.
    for (const scheme of SCHEMES) {
      reports.push(...(await auditScreens(browser, consoleBase, SIGN_IN_SCREENS, scheme)));
    }
    await browser.setCookie("bgs_admin_session", token, consoleBase);
    for (const scheme of SCHEMES) {
      reports.push(...(await auditScreens(browser, consoleBase, CONSOLE_SCREENS, scheme)));
    }
    // The narrowest phones: nothing cut by the screen's edges (WCAG 1.4.10).
    await browser.setViewport(NARROW);
    reports.push(...(await auditWelcome(browser, appBase, "narrow")));
    reports.push(...(await reflowScreens(browser, appBase, APP_SCREENS)));
    reports.push(...(await reflowScreens(browser, consoleBase, CONSOLE_SCREENS)));
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
    const shown = scheme === "narrow" ? "320 px" : scheme === "dark" ? "sombre" : "clair";
    say(`\n✗ ${screen} (${shown})`);
    for (const violation of violations) {
      say(`  - [${violation.impact}] ${violation.rule} : ${violation.help}`);
      for (const target of violation.targets) {
        say(`      ${target}`);
      }
    }
  }
  const clean = reports.length - failing.length;
  say(
    `\n${String(clean)}/${String(reports.length)} écrans sans défaut d'accessibilité (WCAG 2.2 A/AA avec axe-core, et lecture à 320 px).`,
  );
  return failing.length === 0 ? 0 : 1;
}

void main().then((code) => {
  process.exitCode = code;
});
