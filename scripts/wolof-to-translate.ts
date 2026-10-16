// The app's texts in Wolof, as a review sheet for native speakers (W-01): key,
// French, the machine-translated Wolof shown today (owner's decision of 16/10/2026),
// an empty "correction" column, and what must stay as is. Corrections come back
// into packages/i18n/src/messages/wo.ts.
//   pnpm i18n:wolof   writes docs/traduction/wolof-a-relire.csv
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { isPluralMessage, listMessageKeys, lookupMessage } from "../packages/i18n/src/catalog";
import { fr } from "../packages/i18n/src/messages/fr";
import { wo } from "../packages/i18n/src/messages/wo";

/** Byte order mark: spreadsheets then read the accents (é, ë, ñ, ŋ) correctly. */
const BOM = String.fromCharCode(0xfeff);

const repo = fileURLToPath(new URL("..", import.meta.url));
const out = join(repo, "docs/traduction/wolof-a-relire.csv");

/** One CSV field, quoted (French spreadsheets read ";" as the separator). */
function field(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** What the reviewer must keep: the {placeholders} the app fills in. */
function keep(text: string): string {
  const holes = [...new Set(text.match(/\{\w+\}/g) ?? [])];
  return holes.length === 0 ? "" : `À garder tel quel : ${holes.join(" ")}`;
}

/** The Wolof form shown today ("other" covers every count in Wolof). */
function wolofOf(key: string): string {
  const message = lookupMessage(wo, key);
  if (message === undefined) {
    return "";
  }
  return typeof message === "string" ? message : message.other;
}

const rows = [
  [
    "Clé",
    "Français",
    "Wolof actuel (traduction automatique)",
    "Correction (si besoin)",
    "Remarques",
  ]
    .map(field)
    .join(";"),
];
for (const key of listMessageKeys(fr)) {
  const message = lookupMessage(fr, key);
  if (message === undefined) {
    continue;
  }
  const french = isPluralMessage(message) ? message.other : message;
  const plural = isPluralMessage(message) ? "Nombre variable (une seule forme en wolof). " : "";
  rows.push(
    [key, french, wolofOf(key), "", `${plural}${keep(french)}`.trim()].map(field).join(";"),
  );
}

mkdirSync(join(repo, "docs/traduction"), { recursive: true });
writeFileSync(out, BOM + rows.join("\n") + "\n", "utf8");
process.stdout.write(`${String(rows.length - 1)} texts to review, written to ${out}\n`);
