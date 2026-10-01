// End-to-end journeys (AUD-05): the citizen's main journeys in the app's web
// export, and the console's newest one, gesture by gesture, against the real API
// on placeholder data (test-stack.ts). The device journeys come with Maestro once
// the test build exists (A-03).
//   pnpm --filter @bgs/api build && pnpm --filter @bgs/admin build
//   pnpm --filter @bgs/mobile export:web
//   pnpm e2e
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ARTICLE_ID, PROCEDURE_SLUG, SERVICE_ID } from "./test-seed";
import { TestBrowser, type Viewport } from "./test-browser";
import { startStack, type TestStack } from "./test-stack";

const PHONE: Viewport = { width: 412, height: 915, mobile: true };
const DESKTOP: Viewport = { width: 1280, height: 900, mobile: false };
/** After loading, the time the console's pages take to become interactive. */
const SETTLE_MS = 1500;
/** Placeholder texts of test-seed.ts, as the screens show them. */
const ARTICLE_TITLE = "Article fictif pour l'audit d'accessibilité";
const PROCEDURE_TITLE = "Démarche de test";
const SERVICE_NAME = "Mairie fictive";
const TOWN = "Ville fictive";

interface Journey {
  /** What the person does, in plain French (shown in the report). */
  name: string;
  run: (browser: TestBrowser, stack: TestStack) => Promise<void>;
}

const JOURNEYS: Journey[] = [
  {
    name: "S'informer : ouvrir un article, sa source, le garder en favori",
    run: async (browser, { appBase }) => {
      await browser.setViewport(PHONE);
      await browser.open(appBase, 0);
      await browser.catchOpenedLinks();
      await browser.press(ARTICLE_TITLE);
      await browser.waitForPath(`/article/${ARTICLE_ID}`);
      await browser.waitForText("Source");
      await browser.press("Lire sur presidence.sn");
      await browser.waitForOpened("presidence.sn");
      await browser.press("Ajouter aux favoris");
      await browser.waitForControl("Retirer des favoris");
      await browser.open(`${appBase}/favorites`, 0);
      await browser.waitForText(ARTICLE_TITLE);
    },
  },
  {
    name: "Chercher une actualité et l'ouvrir",
    run: async (browser, { appBase }) => {
      await browser.open(`${appBase}/search`, 0);
      await browser.type("Un mot, un lieu, une personne…", "fictif");
      await browser.press(ARTICLE_TITLE);
      await browser.waitForPath(`/article/${ARTICLE_ID}`);
    },
  },
  {
    name: "Trouver une démarche et aller sur sa page officielle",
    run: async (browser, { appBase }) => {
      await browser.open(`${appBase}/procedures`, 0);
      await browser.catchOpenedLinks();
      await browser.type("Rechercher une démarche", "test");
      await browser.press(PROCEDURE_TITLE);
      await browser.waitForPath(`/procedure/${PROCEDURE_SLUG}`);
      await browser.waitForText("Toute personne (texte fictif).");
      await browser.press("Faire la démarche sur e-senegal.sn");
      await browser.waitForOpened("e-senegal.sn");
    },
  },
  {
    name: "Trouver le service le plus proche d'une ville, puis l'itinéraire",
    run: async (browser, { appBase }) => {
      await browser.open(`${appBase}/near-me`, 0);
      await browser.catchOpenedLinks();
      await browser.press("Choisir une ville");
      await browser.type("Rechercher une ville", "Ville fict");
      await browser.press(TOWN);
      await browser.waitForText(`Autour de ${TOWN}`);
      await browser.press(SERVICE_NAME);
      await browser.waitForPath(`/service/${SERVICE_ID}`);
      await browser.press("Itinéraire");
      // The phone's own navigation app, towards the service's position.
      await browser.waitForOpened("14.7");
    },
  },
  {
    name: "Revoir la présentation depuis les Réglages, étape par étape, jusqu'à l'app",
    run: async (browser, { appBase }) => {
      await browser.setViewport(PHONE);
      await browser.open(appBase, 0);
      await browser.press("Réglages");
      await browser.press("Redémarrer");
      await browser.waitForText("Choisissez votre langue");
      for (const title of [
        "L'action du gouvernement, chaque jour",
        "La source, toujours",
        "Gardez l'essentiel, même sans réseau",
      ]) {
        await browser.press("Suivant");
        await browser.waitForText(title);
      }
      await browser.press("Commencer");
      // The presentation fades away over the app, which is there underneath.
      await browser.waitForControlGone("Commencer");
      await browser.waitForText(ARTICLE_TITLE);
    },
  },
  {
    name: "Console : ajouter une personne, qui active son compte avec le lien",
    run: async (browser, { consoleBase, token }) => {
      await browser.setViewport(DESKTOP);
      await browser.setCookie("bgs_admin_session", token, consoleBase);
      // Settled: a form sent before the page is interactive would not show its result.
      await browser.open(`${consoleBase}/comptes`, SETTLE_MS);
      await browser.type("Nom complet", "Personne du parcours (fictive)");
      await browser.type("Adresse e-mail", "parcours@bic.test");
      await browser.type("La même adresse, une seconde fois", "parcours@bic.test");
      await browser.press("Créer le compte");
      await browser.waitForText("Compte créé");
      const link = await browser.fieldValue("Lien d'activation");
      await browser.open(link, SETTLE_MS);
      await browser.waitForText("Activer votre compte");
      await browser.type("Mot de passe (12 caractères ou plus)", "une phrase de passe fictive");
      await browser.type("Le même mot de passe, une seconde fois", "une phrase de passe fictive");
      await browser.press("Enregistrer mon mot de passe");
      await browser.waitForText("Mot de passe enregistré");
    },
  },
  {
    name: "Console : marquer une erreur comme réglée, la retrouver parmi les erreurs réglées",
    run: async (browser, { consoleBase, token }) => {
      await browser.setViewport(DESKTOP);
      await browser.setCookie("bgs_admin_session", token, consoleBase);
      // Settled: a form sent before the page is interactive would not show its result.
      await browser.open(`${consoleBase}/erreurs`, SETTLE_MS);
      // The seed holds one error to deal with and one already fixed (test-seed.ts).
      await browser.waitForText("1 erreur réglée");
      await browser.press("Marquer comme réglée");
      await browser.waitForText("Erreur marquée comme réglée");
      await browser.waitForText("2 erreurs réglées");
      await browser.waitForText("Aucune erreur à traiter");
    },
  },
  {
    name: "Statistiques anonymes : les accepter dans l'app, lire un article, le voir dans la console",
    run: async (browser, { appBase, consoleBase, token }) => {
      await browser.setViewport(PHONE);
      await browser.open(appBase, 0);
      await browser.press("Réglages");
      await browser.press("Oui, envoyer des statistiques anonymes");
      await browser.press("Fermer les réglages");
      await browser.waitForControlGone("Fermer les réglages");
      await browser.press(ARTICLE_TITLE);
      await browser.waitForPath(`/article/${ARTICLE_ID}`);
      await browser.setViewport(DESKTOP);
      await browser.setCookie("bgs_admin_session", token, consoleBase);
      await browser.open(`${consoleBase}/usage`, SETTLE_MS);
      await browser.waitForText("Articles les plus lus");
      // Only this journey reads it with statistics on: the count comes from the app.
      await browser.waitForText(ARTICLE_TITLE);
    },
  },
];

const say = (line: string) => process.stdout.write(`${line}\n`);

/** Runs every journey, even after a failure; keeps a picture of each failed screen. */
async function main(): Promise<number> {
  const stack = await startStack();
  const shots = process.env["E2E_SHOTS"] ?? mkdtempSync(join(tmpdir(), "bgs-e2e-"));
  let browser: TestBrowser | null = null;
  let failed = 0;
  try {
    browser = await TestBrowser.launch();
    await browser.setViewport(PHONE);
    // The welcome screens are the first run's: the journeys start in the app.
    await browser.open(stack.appBase, 0);
    await browser.run('localStorage.setItem("bgs-onboarding", "done")');
    for (const [index, journey] of JOURNEYS.entries()) {
      browser.takeErrors();
      try {
        await journey.run(browser, stack);
        say(`✓ ${journey.name}`);
      } catch (error) {
        failed += 1;
        const picture = join(shots, `parcours-${String(index + 1)}.png`);
        writeFileSync(picture, await browser.screenshot());
        say(`✗ ${journey.name}`);
        say(`    ${error instanceof Error ? error.message : String(error)}`);
        say(`    Écran au moment de l'échec : ${picture}`);
        for (const pageError of browser.takeErrors().slice(0, 5)) {
          say(`    Erreur de la page : ${pageError}`);
        }
      }
    }
  } finally {
    browser?.close();
    stack.stop();
  }
  say(`\n${String(JOURNEYS.length - failed)}/${String(JOURNEYS.length)} parcours réussis.`);
  return failed === 0 ? 0 : 1;
}

void main().then((code) => {
  process.exitCode = code;
});
