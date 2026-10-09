import { officialMediaUrl } from "@bgs/shared-types";
import { createPoliteHttp } from "../../lib/polite-http";
import type { SourceProvider } from "../source-provider";
import { normalizePrimature, primatureArticleId, primatureArticleUrl } from "./normalize";
import { NEWS_PATH, PRIMATURE_ORIGIN, parseArticlePage, parseListingPage } from "./parse";

export interface PrimatureProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Minimum spacing between two requests to the site (politeness). */
  intervalMs?: number;
}

/**
 * Reads the news of primature.sn from its pages (no feed, no API): the listing
 * ("?page=0" is the newest) and each article page. French only.
 */
export function createPrimatureProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: PrimatureProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "primature.sn", fetchImpl, intervalMs });
  const page = (url: string) =>
    http.read(url, (response) => response.text(), { Accept: "text/html" });

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      const listing = parseListingPage(
        await page(`${PRIMATURE_ORIGIN}${NEWS_PATH}?page=${String(number - 1)}`),
      );
      return {
        // The last page has no "last page" link: it is then the last one.
        lastPage: Math.max(listing.lastPageIndex + 1, number),
        refs: listing.items.map((item) => ({
          sourceId: item.slug,
          slug: item.slug,
          lang,
          // The listing's day is the only change marker the site gives.
          sourceUpdatedAt: item.publishedOn ?? "",
          publishedOn: item.publishedOn,
          coverSourceUrl: item.coverUrl === null ? null : officialMediaUrl(item.coverUrl),
        })),
      };
    },

    articleIdFor: (ref) => primatureArticleId(ref.slug),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const html = await page(primatureArticleUrl(ref.slug));
      return normalizePrimature(parseArticlePage(html), {
        slug: ref.slug,
        publishedOn: ref.publishedOn ?? null,
        fetchedAt: now().toISOString(),
      });
    },
  };
}
