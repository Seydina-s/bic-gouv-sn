// Official themes of e-senegal.sn and a proposed theme for each procedure:
// `pnpm --filter @bgs/ingestion procedures:themes`. Proposals are never shown
// in the app: a person validates them in the admin console. Validations are kept.
import { fileURLToPath } from "node:url";
import { FileProcedureRepository, FileProcedureThemeStore } from "@bgs/content-store";
import { createEsenegalProvider } from "../sources/esenegal/esenegal-provider";
import { proposeTheme } from "../sources/esenegal/theme-proposals";

const dataDir = new URL("../../../../.data/", import.meta.url);
const procedures = new FileProcedureRepository(
  process.env["PROCEDURES_STORE_PATH"] ?? fileURLToPath(new URL("procedures.json", dataDir)),
);
const themes = new FileProcedureThemeStore(
  process.env["PROCEDURE_THEMES_PATH"] ?? fileURLToPath(new URL("procedure-themes.json", dataDir)),
);

const official = await createEsenegalProvider().listThemes();
await themes.saveThemes(official);

const proposals: Record<string, string> = {};
let unclassified = 0;
for (const procedure of await procedures.all()) {
  // Procedures exist in French at the source.
  const title =
    procedure.translations.find((translation) => translation.lang === "fr")?.title ?? "";
  const themeId = proposeTheme({ title, summary: procedure.summary });
  if (themeId === null) {
    unclassified += 1;
  } else {
    proposals[procedure.slug] = themeId;
  }
}
const changed = await themes.propose(proposals, new Date().toISOString());

const counts = new Map<string, number>();
for (const themeId of Object.values(proposals)) {
  counts.set(themeId, (counts.get(themeId) ?? 0) + 1);
}
for (const theme of official) {
  process.stdout.write(`${String(counts.get(theme.id) ?? 0).padStart(4)}  ${theme.title}\n`);
}
process.stdout.write(
  `${String(unclassified).padStart(4)}  (à classer par une personne)\n${String(changed)} propositions nouvelles ou modifiées.\n`,
);
