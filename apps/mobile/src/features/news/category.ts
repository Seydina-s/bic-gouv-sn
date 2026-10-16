export const KNOWN_CATEGORIES = [
  "conseil-des-ministres",
  "communiques",
  "international",
  "discours",
  "focus",
  "interviews",
  "agenda",
  "actualites",
] as const;

type KnownCategory = (typeof KNOWN_CATEGORIES)[number];

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

/**
 * The sections offered wherever one is chosen (the front page's chips, the "Filtrer"
 * panel, the notifications by section): those that have articles. "Actualités" was
 * missing (15/10/2026): someone following chosen sections never heard of the
 * ministries' news, and "Agenda", always empty, was offered instead.
 */
export function panelSections(present: readonly string[]): KnownCategory[] {
  return PANEL_SECTIONS.filter((slug) => present.includes(slug));
}

export function isKnown(slug: string): slug is KnownCategory {
  return (KNOWN_CATEGORIES as readonly string[]).includes(slug);
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
