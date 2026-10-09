import { officialMediaUrl, type Lang, type NewsArticle } from "@bgs/shared-types";
import type { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { createPoliteHttp } from "../../lib/polite-http";
import type { SourceArticleRef, SourceProvider } from "../source-provider";
import { detailResponseSchema, listResponseSchema } from "./api-schemas";
import { normalizeDetail, presidenceArticleId } from "./normalize";

export const PRESIDENCE_API = "https://bo-admin.presidence.sn/api/front";
/** Where the API's relative file paths ("/storage/documents/…") are served. */
const PRESIDENCE_FILES = "https://bo-admin.presidence.sn";

/** Official address of a document the API gives as a path, or null if not official. */
function documentUrl(path: string | null): string | null {
  return path === null ? null : officialMediaUrl(new URL(path, PRESIDENCE_FILES).href);
}

export interface PresidenceProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Minimum spacing between two requests to the source (politeness). */
  intervalMs?: number;
}

/** Reads presidence.sn through the public JSON API its own website uses. */
export function createPresidenceProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: PresidenceProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "presidence.sn", fetchImpl, intervalMs });
  const breaker = http.breaker;

  async function getJson<S extends z.ZodType>(path: string, lang: Lang, schema: S) {
    const url = `${PRESIDENCE_API}${path}`;
    const body = await http.read(url, (response) => response.json() as Promise<unknown>, {
      Accept: "application/json",
      "Accept-Language": lang,
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      throw new QuarantineError(url, "unexpected response shape (source structure changed?)");
    }
    return parsed.data;
  }

  return {
    circuits: () => [breaker.snapshot()],

    async listPage(lang, page) {
      const list = await getJson(
        `/articles?page=${String(page)}&q=&categoryIds=`,
        lang,
        listResponseSchema,
      );
      return {
        lastPage: list.data.last_page,
        refs: list.data.data.map((item) => ({
          sourceId: item.id,
          slug: item.slug,
          lang,
          sourceUpdatedAt: item.updated_at,
          coverSourceUrl: item.image === null ? null : officialMediaUrl(item.image),
          documentUrls: [item.document_1, item.document_2]
            .map(documentUrl)
            .filter((url): url is string => url !== null),
        })),
      };
    },

    articleIdFor: (ref) => presidenceArticleId(ref.sourceId),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref: SourceArticleRef): Promise<NewsArticle> {
      const detail = await getJson(
        `/article/${encodeURIComponent(ref.slug)}`,
        ref.lang,
        detailResponseSchema,
      );
      return normalizeDetail(detail, { lang: ref.lang, fetchedAt: now().toISOString() });
    },
  };
}
