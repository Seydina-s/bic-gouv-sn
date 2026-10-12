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
  "affaires-etrangeres",
  "economie",
  "fonction-publique",
  "famille",
  "education",
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

export interface NamedInstitution {
  publisher: string;
  label: string;
  total: number;
}

/** "Ministère de l'Agriculture" is filed under "Agriculture", as people look for it. */
function filingName(label: string): string {
  return label.replace(/^Ministère (de la |de l'|des |du |de )/i, "");
}

/**
 * The institutions this version can name, in the order people expect: the Présidence,
 * the Primature, then the ministries by their subject.
 */
export function orderInstitutions(
  counts: readonly { publisher: string; total: number }[],
  name: (key: NonNullable<ReturnType<typeof institutionLabelKey>>) => string,
): NamedInstitution[] {
  const rank = (publisher: string) =>
    publisher === "presidence" ? 0 : publisher === "primature" ? 1 : 2;
  return counts
    .flatMap(({ publisher, total }) => {
      const key = institutionLabelKey(publisher);
      return key === null || total === 0 ? [] : [{ publisher, label: name(key), total }];
    })
    .sort(
      (a, b) =>
        rank(a.publisher) - rank(b.publisher) ||
        filingName(a.label).localeCompare(filingName(b.label), "fr"),
    );
}
