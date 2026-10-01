// The app's texts still without a Wolof version (W-01), as a sheet for the
// translators: key, French, an empty Wolof column, and what must stay as is.
// Wolof is never written by us: native speakers fill the sheet, then it comes
// back into packages/i18n/src/messages/wo.ts.
//   pnpm i18n:wolof   writes docs/traduction/wolof-a-traduire.csv
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { findMissingMessages, isPluralMessage, lookupMessage } from "../packages/i18n/src/catalog";
import { fr } from "../packages/i18n/src/messages/fr";
import { wo } from "../packages/i18n/src/messages/wo";

/** Byte order mark: spreadsheets then read the accents (é, ë, ñ, ŋ) correctly. */
const BOM = String.fromCharCode(0xfeff);

const repo = fileURLToPath(new URL("..", import.meta.url));
const out = join(repo, "docs/traduction/wolof-a-traduire.csv");

/** One CSV field, quoted (French spreadsheets read ";" as the separator). */
function field(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** What the translator must keep: the {placeholders} the app fills in. */
function keep(text: string): string {
  const holes = [...new Set(text.match(/\{\w+\}/g) ?? [])];
  return holes.length === 0 ? "" : `À garder tel quel : ${holes.join(" ")}`;
}

const rows = [["Clé", "Français", "Wolof (à remplir)", "Remarques"].map(field).join(";")];
for (const key of findMissingMessages(fr, wo)) {
  const message = lookupMessage(fr, key);
  if (message === undefined) {
    continue;
  }
  if (isPluralMessage(message)) {
    for (const form of ["one", "other"] as const) {
      const text = message[form];
      if (text === undefined) {
        continue;
      }
      rows.push(
        [`${key} (${form})`, text, "", `Forme « ${form} » du pluriel. ${keep(text)}`.trim()]
          .map(field)
          .join(";"),
      );
    }
  } else {
    rows.push([key, message, "", keep(message)].map(field).join(";"));
  }
}

mkdirSync(join(repo, "docs/traduction"), { recursive: true });
writeFileSync(out, BOM + rows.join("\n") + "\n", "utf8");
process.stdout.write(`${String(rows.length - 1)} texts to translate, written to ${out}\n`);
