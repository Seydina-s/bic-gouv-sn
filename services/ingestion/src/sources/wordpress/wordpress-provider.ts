import {
  newsArticleSchema,
  officialMediaUrl,
  type Institution,
  type NewsArticle,
} from "@bgs/shared-types";
import { DomUtils, parseDocument } from "htmlparser2";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { isEmptied, plainLetters, sanitizeArticleHtml, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";
import { articleContent, splitBlankLines, type CleanupRules } from "./clean";

/*
 * Ministry sites built with WordPress, read through the public REST interface their
 * own pages use (/wp-json/wp/v2/posts): exact dates, full text, cover photo, and
 * the whole history page by page. French only.
 */

export interface WordpressSite {
  institution: Institution;
  /** Site address without the final slash, e.g. "https://justice.sec.gouv.sn". */
  origin: string;
  cleanup: CleanupRules;
}

/** Section the ministries' posts are shown in (the sites' own categories vary). */
export const MINISTRY_NEWS_CATEGORY = "actualites";
const PER_PAGE = 20;

const renderedSchema = z.object({ rendered: z.string() });
const listedPostSchema = z.object({
  id: z.int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  modified_gmt: z.string().regex(/^\d{4}-\d{2}-\d{2}T/),
  slug: z.string(),
  link: z.url(),
  _embedded: z
    .object({
      "wp:featuredmedia": z.array(z.object({ source_url: z.string().optional() })).optional(),
    })
    .optional(),
});
const postSchema = listedPostSchema.extend({ title: renderedSchema, content: renderedSchema });

/** Stable id of a post: its WordPress number on its site, whatever its address becomes. */
export function wordpressArticleId(origin: string, postId: number | string): string {
  return stableUuid(`${origin}/?p=${String(postId)}`);
}

/** Title as people read it: entities decoded ("l&#8217;eau" → "l’eau"), spaces tidied. */
export function plainTitle(rendered: string): string {
  return plainLetters(DomUtils.textContent(parseDocument(rendered)).replace(/\s+/g, " ").trim());
}

export interface WordpressProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function normalizeWordpressPost(
  site: WordpressSite,
  post: z.infer<typeof postSchema>,
  cover: string | null,
  fetchedAt: string,
): NewsArticle {
  const sourceUrl = post.link;
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = plainTitle(post.title.rendered);
  const clean = (repeatedCover: string | null) =>
    splitBlankLines(
      // Twice: page builders nest blocks, which the second reading lays flat.
      sanitizeArticleHtml(
        sanitizeArticleHtml(
          articleContent(post.content.rendered, title, repeatedCover, site.cleanup),
        ),
      ),
    );
  // The cover repeated in the text is dropped, unless it is the whole post (a poster).
  const withoutCover = clean(cover);
  const bodyHtml = isEmptied(withoutCover) ? clean(null) : withoutCover;
  if (title === "") {
    throw quarantine("post has no title");
  }
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`post ${problem}`);
  }
  const day = post.date.slice(0, 10);
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: wordpressArticleId(site.origin, post.id),
    kind: "news-article",
    publisher: site.institution,
    alsoPublishedBy: [],
    category: MINISTRY_NEWS_CATEGORY,
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: `${post.modified_gmt}Z`,
    fetchedAt,
    contentHash: articleContentHash(translations, day, MINISTRY_NEWS_CATEGORY),
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

export function createWordpressProvider(
  site: WordpressSite,
  { fetchImpl = fetch, now = () => new Date(), intervalMs = 1000 }: WordpressProviderOptions = {},
): SourceProvider {
  const http = createPoliteHttp({
    dependency: new URL(site.origin).hostname,
    fetchImpl,
    intervalMs,
  });
  const api = `${site.origin}/wp-json/wp/v2/posts`;

  async function getJson(url: string): Promise<{ body: unknown; totalPages: number }> {
    return http.read(
      url,
      async (response) => ({
        body: (await response.json()) as unknown,
        totalPages: Number(response.headers.get("x-wp-totalpages") ?? "1"),
      }),
      { Accept: "application/json" },
    );
  }

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, page) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      const url = `${api}?per_page=${String(PER_PAGE)}&page=${String(page)}&orderby=date&order=desc&_fields=id,date,modified_gmt,slug,link,_links,_embedded&_embed=wp:featuredmedia`;
      const { body, totalPages } = await getJson(url);
      const parsed = z.array(listedPostSchema).safeParse(body);
      if (!parsed.success) {
        throw new QuarantineError(url, "unexpected listing shape (site structure changed?)");
      }
      return {
        lastPage: Math.max(totalPages, 1),
        refs: parsed.data.map((post): SourceArticleRef => ({
          sourceId: post.id,
          slug: post.slug,
          lang,
          sourceUpdatedAt: `${post.modified_gmt}Z`,
          publishedOn: post.date.slice(0, 10),
          coverSourceUrl: officialMediaUrl(
            post._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? "",
          ),
        })),
      };
    },

    articleIdFor: (ref) => wordpressArticleId(site.origin, ref.sourceId),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const url = `${api}/${String(ref.sourceId)}?_fields=id,date,modified_gmt,slug,link,title,content`;
      const parsed = postSchema.safeParse((await getJson(url)).body);
      if (!parsed.success) {
        throw new QuarantineError(url, "unexpected post shape (site structure changed?)");
      }
      return normalizeWordpressPost(site, parsed.data, ref.coverSourceUrl, now().toISOString());
    },
  };
}
