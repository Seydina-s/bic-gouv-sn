import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";

/*
 * education.sn (Next.js, 11/10/2026): its home page carries its newest articles whole
 * (title, day, text, photo) in the data it is built from ("__NEXT_DATA__"), as its
 * own content system gives them. Each article stays linked to its page on the site.
 */

export const EDUCATION_SITE = "https://www.education.sn";

const postSchema = z.object({
  id: z.int(),
  title: z.string(),
  url: z.string().min(1),
  published_at: z.string(),
  updated_at: z.string(),
  content: z.string().nullable(),
  cover: z.object({ full_url: z.string() }).nullable().optional(),
});
type Post = z.infer<typeof postSchema>;

/** The posts the page was built with, newest first; empty when the page has none. */
export function postsOf(html: string): Post[] {
  const data = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (data === undefined) {
    return [];
  }
  const parsed = z
    .object({
      props: z.object({ pageProps: z.object({ fallback: z.record(z.string(), z.unknown()) }) }),
    })
    .safeParse(JSON.parse(data));
  if (!parsed.success) {
    return [];
  }
  const fallback = parsed.data.props.pageProps.fallback;
  const key = Object.keys(fallback).find((name) => name.startsWith("/posts?"));
  const posts = z.array(z.unknown()).safeParse(key === undefined ? [] : fallback[key]);
  return (posts.success ? posts.data : []).flatMap((post) => {
    const one = postSchema.safeParse(post);
    return one.success ? [one.data] : [];
  });
}

export function educationArticleId(url: string): string {
  return stableUuid(`${EDUCATION_SITE}/posts/${url}`);
}

/** A photo of the site's content system, its spaces written as an address requires. */
function coverUrl(post: Post): string | null {
  const raw = post.cover?.full_url;
  return raw === undefined ? null : officialMediaUrl(encodeURI(raw));
}

export function normalizeEducationPost(post: Post, fetchedAt: string): NewsArticle {
  const sourceUrl = `${EDUCATION_SITE}/posts/${post.url}`;
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = plainLetters(post.title.replace(/\s+/g, " ").trim());
  if (title === "") {
    throw quarantine("article has no title");
  }
  const bodyHtml = sanitizeNested(post.content ?? "");
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`article ${problem}`);
  }
  const day = post.published_at.slice(0, 10);
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: educationArticleId(post.url),
    kind: "news-article",
    publisher: "education",
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: null,
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

export interface EducationProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createEducationProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: EducationProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "education.sn", fetchImpl, intervalMs });
  let latest: Promise<Post[]> | null = null;
  const posts = () => {
    latest ??= http.read(`${EDUCATION_SITE}/`, (response) => response.text()).then(postsOf);
    latest.catch(() => {
      latest = null;
    });
    return latest;
  };

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr" || number > 1) {
        return { refs: [], lastPage: 1 };
      }
      latest = null;
      const found = await posts();
      if (found.length === 0) {
        throw new QuarantineError(
          EDUCATION_SITE,
          "no article in the home page (site structure changed?)",
        );
      }
      return {
        lastPage: 1,
        refs: found.map((post): SourceArticleRef => ({
          sourceId: post.url,
          slug: post.url,
          lang,
          sourceUpdatedAt: post.updated_at,
          publishedOn: post.published_at.slice(0, 10),
          coverSourceUrl: coverUrl(post),
        })),
      };
    },

    articleIdFor: (ref) => educationArticleId(String(ref.sourceId)),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const post = (await posts()).find((candidate) => candidate.url === ref.sourceId);
      if (post === undefined) {
        throw new QuarantineError(
          `${EDUCATION_SITE}/posts/${String(ref.sourceId)}`,
          "no longer among the site's newest articles",
        );
      }
      return normalizeEducationPost(post, now().toISOString());
    },
  };
}
