/*
 * Hints for the person who verifies the imported services (MAP-07). They only point
 * at what deserves a closer look; a person always decides, and nothing here is ever
 * shown in the app.
 */

export type ServiceHint = "notState" | "vague";

/** Words of company or private-body names: rarely a state service. */
const PRIVATE_BODY =
  /\b(?:s\.?a\.?r\.?l|suarl|gie|banque|bank|restaurant|boutique|f[ée]d[ée]ration|ong|association|clinique|pharmacie|soci[ée]t[ée]|entreprise|cabinet|solutions?)\b|\bh[ôo]tel\b(?! de ville)/i;

/** A name that only says what it is, not which one: its place must be checked. */
const GENERIC_NAME =
  /^(?:annexe\s*)?(?:mairie|h[ôo]tel de ville|[ée]tat[- ]civil|commissariat|police|gendarmerie|brigade|tribunal|pr[ée]fecture|sous[- ]pr[ée]fecture)(?:\s*\(?[ée]tat[- ]civil\)?)?$/i;

/** What a reviewer should look at twice for this name. */
export function serviceHints(name: string): ServiceHint[] {
  const trimmed = name.trim();
  const hints: ServiceHint[] = [];
  if (PRIVATE_BODY.test(trimmed)) {
    hints.push("notState");
  }
  if (GENERIC_NAME.test(trimmed)) {
    hints.push("vague");
  }
  return hints;
}
