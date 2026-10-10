import {
  newsArticleSchema,
  officialMediaUrl,
  type Institution,
  type NewsArticle,
} from "@bgs/shared-types";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";
import { feedDays, parseDrupalArticle, parseDrupalListing } from "./drupal-parse";

/*
 * Ministry sites built with Drupal 7: each section is listed page by page
 * ("?page=0" is the newest), each article read from its page. The listing's day is
 * used when it shows one, else the RSS feed's (newest articles only); an article
 * dated by neither keeps no date: never guessed (docs/sources.md).
 */

export interface DrupalSection {
  /** Listing path, also the start of its articles' paths ("/actualites"). */
  path: string;
  /** Our section for its articles. */
  category: string;
  /** Start of its articles' paths when not under the listing (Drupal 9: "/node/"). */
  articlePrefix?: string;
}

export interface DrupalSite {
  institution: Institution;
  origin: string;
  sections: readonly DrupalSection[];
  /** Feed giving the publication day of the newest articles, when the listing has none. */
  feedPath?: string;
  /** The site's "Crawl-delay" (robots.txt), in milliseconds. */
  intervalMs: number;
}

/** "/sites/default/files/styles/slider/public/a.jpg?itok=x" → the original file. */
export function originalImage(src: string, origin: string): string | null {
  try {
    const url = new URL(src.replace(/\/styles\/[^/]+\/public\//, "/"), origin);
    url.search = "";
    return officialMediaUrl(url.href);
  } catch {
    return null;
  }
}

export function drupalArticleId(origin: string, path: string): string {
  return stableUuid(new URL(path, origin).href);
}

export interface DrupalProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createDrupalProvider(
  site: DrupalSite,
  {
    fetchImpl = fetch,
    now = () => new Date(),
    intervalMs = site.intervalMs,
  }: DrupalProviderOptions = {},
): SourceProvider {
  const http = createPoliteHttp({
    dependency: new URL(site.origin).hostname,
    fetchImpl,
    intervalMs,
  });
  const page = (url: string) =>
    http.read(url, (response) => response.text(), { Accept: "text/html" });
  const prefixOf = (section: DrupalSection) => section.articlePrefix ?? `${section.path}/`;
  const sectionOf = (path: string) =>
    site.sections.find((section) => path.startsWith(prefixOf(section)));
  /** Pages of each section, read again on every first page (new pages appear). */
  let pageCounts: number[] = [];
  const days = new Map<string, string>();

  async function listing(section: DrupalSection, index: number) {
    const parsed = parseDrupalListing(
      await page(`${site.origin}${section.path}?page=${String(index)}`),
      site.origin,
      (path) => path.startsWith(prefixOf(section)),
    );
    if (index === 0) {
      pageCounts[site.sections.indexOf(section)] = parsed.lastPageIndex + 1;
    }
    return parsed;
  }

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      if (number === 1) {
        pageCounts = [];
        if (site.feedPath !== undefined) {
          for (const [path, day] of feedDays(await page(`${site.origin}${site.feedPath}`))) {
            days.set(path, day);
          }
        }
        for (const section of site.sections.slice(1)) {
          await listing(section, 0);
        }
      }
      // Global page n: the sections one after the other, each from its newest page.
      let rest = number - 1;
      let sectionIndex = 0;
      for (; sectionIndex < site.sections.length; sectionIndex += 1) {
        const count = pageCounts[sectionIndex] ?? 1;
        if (rest < count || sectionIndex === site.sections.length - 1) {
          break;
        }
        rest -= count;
      }
      const section = site.sections[sectionIndex];
      if (section === undefined) {
        return { refs: [], lastPage: number };
      }
      const parsed = await listing(section, rest);
      const lastPage = site.sections.reduce(
        (sum, _section, index) => sum + (pageCounts[index] ?? 1),
        0,
      );
      return {
        lastPage: Math.max(lastPage, number),
        refs: parsed.items.map((item): SourceArticleRef => {
          const day = item.publishedOn ?? days.get(item.path) ?? null;
          return {
            sourceId: item.path,
            slug: item.path,
            lang,
            sourceUpdatedAt: day ?? "",
            publishedOn: day,
            coverSourceUrl:
              item.coverPath === null ? null : originalImage(item.coverPath, site.origin),
          };
        }),
      };
    },

    articleIdFor: (ref) => drupalArticleId(site.origin, ref.slug),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const sourceUrl = new URL(ref.slug, site.origin).href;
      const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
      const parsed = parseDrupalArticle(await page(sourceUrl));
      if (parsed === null) {
        throw quarantine("no article in the page (site structure changed?)");
      }
      const title = plainLetters(parsed.title);
      const bodyHtml = sanitizeNested(parsed.bodyHtml);
      if (title === "") {
        throw quarantine("article has no title");
      }
      const problem = unpublishable(title, bodyHtml, "fr");
      if (problem !== null) {
        throw quarantine(`article ${problem}`);
      }
      const category = sectionOf(ref.slug)?.category ?? "actualites";
      const day = ref.publishedOn ?? parsed.publishedOn;
      const translations: NewsArticle["translations"] = [
        { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
      ];
      const candidate: NewsArticle = {
        id: drupalArticleId(site.origin, ref.slug),
        kind: "news-article",
        publisher: site.institution,
        alsoPublishedBy: [],
        category,
        sourceUrl,
        sourcePublishedOn: day,
        sourceUpdatedAt: null,
        fetchedAt: now().toISOString(),
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
    },
  };
}
