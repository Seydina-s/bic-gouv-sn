/*
 * Words the Wolof translation must use (ML-12). Two sources only: the owner's
 * corrections after reading the trials (a native speaker's word wins), and the forms
 * the Présidence itself uses in its official Wolof articles, counted on the 318
 * official pairs on 17/10/2026. Nothing here is invented: an entry without one of
 * these sources does not belong in the list.
 */

export interface GlossaryEntry {
  /** The French word or phrase, as it appears in an article. */
  french: string;
  /** The Wolof to write instead, exactly. */
  wolof: string;
  /** Who says so: the owner (with the day), or the Présidence (with how often). */
  source: string;
}

export const WOLOF_GLOSSARY: readonly GlossaryEntry[] = [
  {
    french: "Monsieur (before a name)",
    wolof: "Gòor gi",
    source: "owner, 17/10/2026 (never « Basaa », not a Wolof word)",
  },
  {
    french: "Madame (before a name)",
    wolof: "Soxna",
    source: "Présidence, 81 uses",
  },
  {
    french: "le Président de la République, le Chef de l'État",
    wolof: "Njiitu Réew mi",
    source: "Présidence, in 252 of the 259 articles that name the office",
  },
  {
    french: "le Premier ministre",
    wolof: "Njiitu Jëwriñ yi",
    source: "Présidence (never a transcription such as « Firmiyee Ministar »)",
  },
  {
    french: "le Conseil des ministres",
    wolof: "Ndiisoog Jëwriñ",
    source: "Présidence, in 37 of 41 articles",
  },
  {
    french: "ministre",
    wolof: "jëwriñ",
    source: "Présidence, in 79 of 89 articles",
  },
  {
    french: "le Gouvernement",
    wolof: "Ngóornamaŋ",
    source: "Présidence, in 85 of 106 articles",
  },
  {
    french: "communiqué",
    wolof: "saabal",
    source: "Présidence",
  },
];

/** The list as the model reads it. */
export function glossaryRules(entries: readonly GlossaryEntry[] = WOLOF_GLOSSARY): string {
  return [
    "Words to use exactly (official Wolof of the Presidency, and corrections by a native speaker); they win over any other rendering:",
    ...entries.map((entry) => `- ${entry.french} → ${entry.wolof}`),
    "Never write a French word in Wolof spelling (such as « Firmiyee Ministar ») when this list or the official examples give the Wolof word; when neither gives one, keep the French word as it is.",
  ].join("\n");
}
