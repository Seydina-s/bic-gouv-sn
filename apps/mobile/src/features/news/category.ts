const KNOWN = [
  "conseil-des-ministres",
  "communiques",
  "international",
  "discours",
  "focus",
  "interviews",
  "agenda",
] as const;

type KnownCategory = (typeof KNOWN)[number];

function isKnown(slug: string): slug is KnownCategory {
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
