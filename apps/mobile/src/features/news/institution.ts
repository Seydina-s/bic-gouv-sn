const KNOWN = [
  "presidence",
  "primature",
  "justice",
  "industrie-commerce",
  "energie",
  "hydraulique",
  "agriculture",
  "peches",
  "emploi-formation",
  "interieur",
  "sante",
  "forces-armees",
  "culture",
  "enseignement-superieur",
  "numerique",
  "infrastructures",
] as const;

type KnownInstitution = (typeof KNOWN)[number];

function isKnown(publisher: string): publisher is KnownInstitution {
  return (KNOWN as readonly string[]).includes(publisher);
}

/**
 * i18n key of the institution that published an article. An API older than the field
 * only served presidence.sn; an institution added after this version is not named
 * (the article itself still opens, with its official link).
 */
export function institutionLabelKey(
  publisher: string | undefined,
): `institutions.${KnownInstitution}` | null {
  const id = publisher ?? "presidence";
  return isKnown(id) ? `institutions.${id}` : null;
}

/** Site an official page belongs to, as people write it: "primature.sn". */
export function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
