import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";

/*
 * mctn.sn, the Telecommunications and Digital ministry: an Angular site reading its
 * own public interface (api.mctn.sn, no key), which gives each publication's full
 * text, day, photos and section. Its public page is www.mctn.sn/post/<slug>.
 */

export const NUMERIQUE_SITE = "https://www.mctn.sn";
export const NUMERIQUE_API = "https://api.mctn.sn/api";
const MEDIA = "https://api.mctn.sn/fichier/afficher?path=";

const publicationSchema = z.object({
  id: z.int(),
  title: z.string(),
  langue: z.string().nullable(),
  description: z.string().nullable(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  updated_at: z.string(),
  status: z.string(),
  publish_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  thumbnail_full_path: z.string().nullable().optional(),
  fichiers: z
    .array(z.object({ type: z.string(), path: z.string() }))
    .nullable()
    .optional(),
});
type Publication = z.infer<typeof publicationSchema>;

// Each publication is checked on its own: one malformed entry never hides the page.
const pageSchema = z.object({
  last_page: z.int().positive(),
  data: z.array(z.looseObject({ id: z.int() })),
});

function photo(path: string): string | null {
  return officialMediaUrl(`${MEDIA}${encodeURIComponent(path)}`);
}

export function numeriqueArticleId(id: number | string): string {
  return stableUuid(`${NUMERIQUE_API}/publication/${String(id)}`);
}

export function normalizeNumerique(publication: Publication, fetchedAt: string): NewsArticle {
  const sourceUrl = `${NUMERIQUE_SITE}/post/${publication.slug}`;
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  if (publication.status !== "published") {
    throw quarantine("publication is not published at the source");
  }
  if (publication.langue !== null && publication.langue !== "fr") {
    throw quarantine(`text in another language (${publication.langue})`);
  }
  const title = plainLetters(publication.title.replace(/\s+/g, " ").trim());
  const gallery = (publication.fichiers ?? [])
    .filter((file) => file.type === "photo")
    .map((file) => photo(file.path))
    .filter((url): url is string => url !== null)
    .map((url) => `<p><img src="${url}" alt="" /></p>`);
  const bodyHtml = sanitizeNested([publication.description ?? "", ...gallery].join(""));
  if (title === "") {
    throw quarantine("publication has no title");
  }
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`publication ${problem}`);
  }
  const day = publication.publish_date;
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: numeriqueArticleId(publication.id),
    kind: "news-article",
    publisher: "numerique",
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: publication.updated_at,
    fetchedAt,
    contentHash: articleContentHash(translations, day, "actualites"),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
  const result = newsArticleSchema.safeParse(candidate);
  if (!result.success) {
    throw quarantine(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

export interface NumeriqueProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createNumeriqueProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: NumeriqueProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "mctn.sn", fetchImpl, intervalMs });
  const json = (url: string) =>
    http.read(url, (response) => response.json() as Promise<unknown>, {
      Accept: "application/json",
    });

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      const url = `${NUMERIQUE_API}/publications/category/actualites?page=${String(number)}`;
      const parsed = pageSchema.safeParse(await json(url));
      if (!parsed.success) {
        throw new QuarantineError(url, "unexpected listing shape (site structure changed?)");
      }
      return {
        lastPage: parsed.data.last_page,
        refs: parsed.data.data.map((entry): SourceArticleRef => {
          const publication = publicationSchema.safeParse(entry);
          if (!publication.success) {
            // Read again by itself, it is then set aside with its reason.
            return {
              sourceId: entry.id,
              slug: "",
              lang,
              sourceUpdatedAt: "",
              coverSourceUrl: null,
            };
          }
          const { id, slug, updated_at, publish_date, thumbnail_full_path } = publication.data;
          return {
            sourceId: id,
            slug,
            lang,
            sourceUpdatedAt: updated_at,
            publishedOn: publish_date,
            coverSourceUrl:
              thumbnail_full_path === null || thumbnail_full_path === undefined
                ? null
                : officialMediaUrl(thumbnail_full_path),
          };
        }),
      };
    },

    articleIdFor: (ref) => numeriqueArticleId(ref.sourceId),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      if (ref.slug === "") {
        throw new QuarantineError(
          `${NUMERIQUE_API}/publications (id ${String(ref.sourceId)})`,
          "publication without a public page (no name, or an unexpected shape)",
        );
      }
      const url = `${NUMERIQUE_API}/publication/${encodeURIComponent(ref.slug)}`;
      const body = (await json(url)) as { data?: unknown } | null;
      const parsed = publicationSchema.safeParse(body?.data ?? body);
      if (!parsed.success) {
        throw new QuarantineError(url, "unexpected publication shape (site structure changed?)");
      }
      return normalizeNumerique(parsed.data, now().toISOString());
    },
  };
}
