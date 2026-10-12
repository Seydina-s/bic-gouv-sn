import { createTranslator, fr } from "@bgs/i18n";
import {
  compareInstitutions,
  institutionOfUrl,
  institutionSchema,
  newsPublishersResponseSchema,
  type CircuitStatus,
  type Institution,
  type NewsPublishersResponse,
} from "@bgs/shared-types";
import { readPublicStatus, type PublicStatusOptions } from "./public-status";

/** The institutions' names, as the app shows them. */
const names = createTranslator({ lang: "fr", reference: fr, catalog: fr });

/** One institution whose news the app carries, as the console shows it. */
export interface SourceRow {
  institution: Institution;
  name: string;
  total: number;
  /** Publication day of its newest article. */
  newestOn: string | null;
  /** When its most recently collected article reached the app. */
  lastFetchedAt: string | null;
  /** The protection of its site; null when the collection report does not name it. */
  circuit: CircuitStatus["state"] | null;
}

/** How many articles each institution has, read through the public API. */
export async function getPublishers(
  options: PublicStatusOptions,
): Promise<NewsPublishersResponse["publishers"] | null> {
  return (
    (await readPublicStatus("/v1/news/publishers?lang=fr", newsPublishersResponseSchema, options))
      ?.publishers ?? null
  );
}

/**
 * Every institution followed, a suspended site first (it needs a look), then in the
 * order people expect: Présidence, Primature, ministries by subject.
 */
export function sourceRows(
  publishers: NewsPublishersResponse["publishers"],
  circuits: readonly CircuitStatus[],
): SourceRow[] {
  const protection = new Map<Institution, CircuitStatus["state"]>();
  for (const circuit of circuits) {
    const institution = institutionOfUrl(`https://${circuit.dependency}/`);
    if (institution !== null) {
      protection.set(institution, circuit.state);
    }
  }
  const attention = (row: SourceRow) => (row.circuit === "open" ? 0 : 1);
  return publishers
    .flatMap((count) => {
      const known = institutionSchema.safeParse(count.publisher);
      if (!known.success) {
        return [];
      }
      return [
        {
          institution: known.data,
          name: names(`institutions.${known.data}`),
          total: count.total,
          newestOn: count.newestOn ?? null,
          lastFetchedAt: count.lastFetchedAt ?? null,
          circuit: protection.get(known.data) ?? null,
        },
      ];
    })
    .sort(
      (a, b) =>
        attention(a) - attention(b) ||
        compareInstitutions(
          { publisher: a.institution, name: a.name },
          { publisher: b.institution, name: b.name },
        ),
    );
}
