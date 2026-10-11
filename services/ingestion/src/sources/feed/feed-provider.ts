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

/*
 * Ministry sites whose RSS feed carries each article whole (title, day, full text):
 * fonctionpublique.gouv.sn (SPIP, 11/10/2026). The feed is the listing and the
 * article at once; the site's pages are only linked, as the source.
 */

export interface FeedSite {
  institution: Institution;
  /** The site's address: links and photos are read against it. */
  origin: string;
  feedPath: string;
  /** Our section for its articles. */
  category: string;
  intervalMs: number;
}

export interface FeedItem {
  title: string;
  link: string;
  /** "2026-06-08" */
  day: string;
  html: string;
}

/** XML text as written: entities and numeric references decoded, CDATA unwrapped. */
export function xmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/.exec(raw);
  if (cdata !== null) {
    return cdata[1] ?? "";
  }
  return raw
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function tag(item: string, name: string): string | null {
  const match = new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`).exec(item);
  return match === null ? null : xmlText(match[1] ?? "");
}

/** The feed's articles: those with a link on the site, a day and a text. */
export function parseFeed(xml: string, origin: string): FeedItem[] {
  const host = new URL(origin).host;
  return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)].flatMap(([, item = ""]) => {
    const rawLink = tag(item, "link")?.trim() ?? "";
    const when = tag(item, "dc:date") ?? tag(item, "pubDate") ?? "";
    const time = Date.parse(when);
    const html = tag(item, "content:encoded") ?? tag(item, "description") ?? "";
    let link: URL;
    try {
      link = new URL(rawLink, origin);
    } catch {
      return [];
    }
    // The site's own pages only (the feed also lists the home page), always in https.
    if (link.host !== host || (link.pathname === "/" && link.search === "") || Number.isNaN(time)) {
      return [];
    }
    link.protocol = "https:";
    return [
      {
        title: plainLetters((tag(item, "title") ?? "").replace(/\s+/g, " ").trim()),
        link: link.toString(),
        day: new Date(time).toISOString().slice(0, 10),
        html,
      },
    ];
  });
}

/** Photos and links of the text made absolute, against the site. */
function absolute(html: string, origin: string): string {
  return html.replace(/\b(src|href)="([^"]+)"/g, (whole, name: string, value: string) => {
    try {
      const url = new URL(value, `${origin}/`);
      if (url.host === new URL(origin).host) {
        url.protocol = "https:";
      }
      return `${name}="${url.toString()}"`;
    } catch {
      return whole;
    }
  });
}

export function feedArticleId(link: string): string {
  return stableUuid(link);
}

export function normalizeFeedItem(item: FeedItem, site: FeedSite, fetchedAt: string): NewsArticle {
  const quarantine = (reason: string) => new QuarantineError(item.link, reason);
  if (item.title === "") {
    throw quarantine("article has no title");
  }
  const bodyHtml = sanitizeNested(absolute(item.html, site.origin));
  const problem = unpublishable(item.title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`article ${problem}`);
  }
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title: item.title, bodyHtml, sourceUrl: item.link },
  ];
  const candidate: NewsArticle = {
    id: feedArticleId(item.link),
    kind: "news-article",
    publisher: site.institution,
    alsoPublishedBy: [],
    category: site.category,
    sourceUrl: item.link,
    sourcePublishedOn: item.day,
    sourceUpdatedAt: null,
    fetchedAt,
    contentHash: articleContentHash(translations, item.day, site.category),
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

/** The first official photo of the text: the article's cover. */
function coverOf(item: FeedItem, origin: string): string | null {
  for (const [, src = ""] of absolute(item.html, origin).matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
    const official = officialMediaUrl(src);
    if (official !== null) {
      return official;
    }
  }
  return null;
}

export interface FeedProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export function createFeedProvider(
  site: FeedSite,
  { fetchImpl = fetch, now = () => new Date() }: FeedProviderOptions = {},
): SourceProvider {
  const http = createPoliteHttp({
    dependency: new URL(site.origin).host,
    fetchImpl,
    intervalMs: site.intervalMs,
  });
  /** The feed, read once per pass: the listing and the articles come from it. */
  let latest: Promise<FeedItem[]> | null = null;
  const items = () => {
    latest ??= http
      .read(`${site.origin}${site.feedPath}`, (response) => response.text())
      .then((xml) => parseFeed(xml, site.origin));
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
      return {
        lastPage: 1,
        refs: (await items()).map((item): SourceArticleRef => ({
          sourceId: item.link,
          slug: item.link,
          lang,
          // The text itself marks a change: SPIP feeds give no modification time.
          sourceUpdatedAt: `${item.day}#${articleContentHash(
            [
              {
                lang: "fr",
                status: "official",
                title: item.title,
                bodyHtml: item.html,
                sourceUrl: item.link,
              },
            ],
            item.day,
            site.category,
          ).slice(0, 12)}`,
          publishedOn: item.day,
          coverSourceUrl: coverOf(item, site.origin),
        })),
      };
    },

    articleIdFor: (ref) => feedArticleId(String(ref.sourceId)),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const item = (await items()).find((candidate) => candidate.link === ref.sourceId);
      if (item === undefined) {
        throw new QuarantineError(String(ref.sourceId), "no longer in the site's feed");
      }
      return normalizeFeedItem(item, site, now().toISOString());
    },
  };
}
