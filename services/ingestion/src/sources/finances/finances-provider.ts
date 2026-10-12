import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";

/*
 * finances.gouv.sn (Nuxt, 12/10/2026): its pages are built from the ministry's own
 * content service, apimfb.finances.gouv.sn, whose list of published articles gives
 * each one whole (title, day, text, cover). Each article stays linked to its page on
 * finances.gouv.sn. The site answers only from abroad: in Senegal, its reads go
 * through our server (ssh-relay.ts). Only what an article is made of is read: the
 * service also names the agent who entered it, which is never kept.
 */

export const FINANCES_SITE = "https://finances.gouv.sn";
export const FINANCES_API = "https://apimfb.finances.gouv.sn";
/** The hosts the relay may read for this source. */
export const FINANCES_RELAY_HOSTS = ["apimfb.finances.gouv.sn"] as const;

const PAGE_SIZE = 20;

const postSchema = z.object({
  slug: z.string().min(1),
  type: z.string(),
  category: z.object({ name: z.string() }).nullable().optional(),
  publishedAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
  cover_url: z.string().nullable().optional(),
  i18n: z.object({ fr: z.object({ title: z.string(), content: z.string().nullable() }) }),
});
type Post = z.infer<typeof postSchema>;

const pageSchema = z.object({
  data: z.object({
    list: z.array(z.unknown()),
    pagination: z.object({ totalPages: z.int().nonnegative() }),
  }),
});

/** The readable posts of one page of the list, and how many pages there are. */
export function postsOfPage(raw: unknown): { posts: Post[]; lastPage: number } {
  const page = pageSchema.parse(raw);
  return {
    lastPage: Math.max(1, page.data.pagination.totalPages),
    posts: page.data.list.flatMap((post) => {
      const one = postSchema.safeParse(post);
      return one.success ? [one.data] : [];
    }),
  };
}

export function financesArticleUrl(slug: string): string {
  return `${FINANCES_SITE}/actualites/${encodeURIComponent(slug)}`;
}

export function financesArticleId(slug: string): string {
  return stableUuid(financesArticleUrl(slug));
}

/** A communiqué where the ministry files it so; every other article is news. */
function categoryOf(post: Post): string {
  return post.type === "COMMUNIQUE" || post.category?.name === "Communiqués"
    ? "communiques"
    : "actualites";
}

/** Dakar keeps UTC all year: the day is the date part of the publication time. */
function dayOf(post: Post): string {
  return new Date(post.publishedAt).toISOString().slice(0, 10);
}

export function normalizeFinancesPost(post: Post, fetchedAt: string): NewsArticle {
  const sourceUrl = financesArticleUrl(post.slug);
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = plainLetters(post.i18n.fr.title.replace(/\s+/g, " ").trim());
  if (title === "") {
    throw quarantine("article has no title");
  }
  const bodyHtml = sanitizeNested(post.i18n.fr.content ?? "");
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`article ${problem}`);
  }
  const day = dayOf(post);
  const category = categoryOf(post);
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: financesArticleId(post.slug),
    kind: "news-article",
    publisher: "finances",
    alsoPublishedBy: [],
    category,
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: post.updatedAt,
    fetchedAt,
    contentHash: articleContentHash(translations, day, category),
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

export interface FinancesProviderOptions {
  /** The relay through our server in Senegal; plain fetch where the site answers. */
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createFinancesProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 2000,
}: FinancesProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "finances.gouv.sn", fetchImpl, intervalMs });
  /** The posts of the pages read in this pass: the list carries each article whole. */
  const seen = new Map<string, Post>();

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 1 };
      }
      const url = `${FINANCES_API}/article/published?page=${String(number)}&limit=${String(PAGE_SIZE)}`;
      const { posts, lastPage } = postsOfPage(
        await http.read(url, (response) => response.json() as Promise<unknown>),
      );
      if (number === 1 && posts.length === 0) {
        throw new QuarantineError(FINANCES_SITE, "no article in the list (service changed?)");
      }
      for (const post of posts) {
        seen.set(post.slug, post);
      }
      return {
        lastPage,
        refs: posts.map((post): SourceArticleRef => ({
          sourceId: post.slug,
          slug: post.slug,
          lang,
          sourceUpdatedAt: post.updatedAt,
          publishedOn: dayOf(post),
          coverSourceUrl: officialMediaUrl(post.cover_url ?? ""),
        })),
      };
    },

    articleIdFor: (ref) => financesArticleId(String(ref.sourceId)),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    fetchArticle(ref) {
      const post = seen.get(String(ref.sourceId));
      if (post === undefined) {
        return Promise.reject(
          new QuarantineError(
            financesArticleUrl(String(ref.sourceId)),
            "not in the pages of the list read in this pass",
          ),
        );
      }
      return Promise.resolve(normalizeFinancesPost(post, now().toISOString()));
    },
  };
}
