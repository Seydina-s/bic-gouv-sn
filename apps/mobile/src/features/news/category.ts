const KNOWN = [
  "conseil-des-ministres",
  "communiques",
  "international",
  "discours",
  "focus",
  "interviews",
  "agenda",
  "actualites",
] as const;

type KnownCategory = (typeof KNOWN)[number];

/**
 * Sections offered by the "Filtrer" panel, those with articles only: "Actualités"
 * first, where the ministries file most of theirs (5 248 of 6 507 on 15/10/2026).
 */
export const PANEL_SECTIONS: readonly KnownCategory[] = [
  "actualites",
  "communiques",
  "conseil-des-ministres",
  "discours",
  "international",
  "focus",
  "interviews",
  "agenda",
];

/** The panel's sections that have articles, in its order. */
export function panelSections(present: readonly string[]): KnownCategory[] {
  return PANEL_SECTIONS.filter((slug) => present.includes(slug));
}

export function isKnown(slug: string): slug is KnownCategory {
  return (KNOWN as readonly string[]).includes(slug);
}

/** i18n key of a section label; unknown sections read as "Actualité". */
export function categoryLabelKey(slug: string): `categories.${KnownCategory | "general"}` {
  return isKnown(slug) ? `categories.${slug}` : "categories.general";
}

/** Sections offered as filters on the front page, in the order of the official site. */
export const SECTION_FILTERS: readonly KnownCategory[] = [
  "conseil-des-ministres",
  "communiques",
  "discours",
  "international",
  "focus",
  "interviews",
  "agenda",
];
