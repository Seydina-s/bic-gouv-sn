import { plainOf, type ProcedurePage } from "./procedure-page";

/*
 * Links a procedure to the map (DEM-04): the sheet's own words say where to go
 * ("Au commissariat de police", "à la mairie de votre commune"); the app offers the
 * nearest verified service of that kind. Nothing is guessed beyond those words.
 */

/** The kinds of service a procedure can send people to. */
export type LinkedKind = "gendarmerie" | "police" | "tribunal" | "prefecture" | "mairie";

/** Words of "where to go" → kind of service, the most specific first. */
const RULES: readonly (readonly [RegExp, LinkedKind])[] = [
  [/\bgendarmerie\b|\bbrigade\b/, "gendarmerie"],
  [/\bcommissariat\b|\bpolice\b/, "police"],
  [/\btribunal\b|\bgreffe\b/, "tribunal"],
  [/\bprefecture\b|\bgouvernance\b/, "prefecture"],
  [/\bmairie\b|\betat civil\b|\bhotel de ville\b/, "mairie"],
];

function folded(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[’'-]/g, " ");
}

/** The kind of service a "where to go" text names, or null when it names none. */
export function serviceCategoryIn(text: string): LinkedKind | null {
  const words = folded(text);
  return RULES.find(([pattern]) => pattern.test(words))?.[1] ?? null;
}

/** Where the page says to go: the brief's answer, else the "where" section's text. */
export function whereToGo(page: ProcedurePage): LinkedKind | null {
  const fact = page.facts.find((item) => item.kind === "where");
  if (fact !== undefined) {
    return serviceCategoryIn(fact.value);
  }
  const section = page.sections.find((item) => item.kind === "where");
  return section === undefined ? null : serviceCategoryIn(plainOf(section.items));
}
