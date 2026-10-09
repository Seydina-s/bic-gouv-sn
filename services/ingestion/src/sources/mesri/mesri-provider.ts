import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { isTag, type ChildNode, type Element } from "domhandler";
import render from "dom-serializer";
import { DomUtils, parseDocument } from "htmlparser2";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { isEmptied, plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import { parseDrupalListing } from "../drupal/drupal-parse";
import type { SourceArticleRef, SourceProvider } from "../source-provider";

/*
 * mesrisenegal.sn, the Higher Education ministry's site (mesr.gouv.sn leads there):
 * news listed page by page ("/actualites?page=N", newest first), each article page
 * giving its title, its exact time ("<time datetime>"), its section and its text
 * ("#article-body"). Pictures placed inside the text are embedded as data, not files:
 * the common sanitization leaves them out; the cover photo of the listing stays.
 */

export const MESRI_ORIGIN = "https://mesrisenegal.sn";
const ARTICLE_PATH = "/article/";

function find(nodes: ChildNode[], test: (element: Element) => boolean): Element | null {
  return DomUtils.findOne(test, nodes);
}

function hasClass(element: Element, name: string): boolean {
  return (element.attribs["class"] ?? "").split(/\s+/).includes(name);
}

/** The day of a "<time datetime>" ("2026-10-04T21:40:00+00:00" → "2026-10-04"), or null. */
function dayOf(time: Element | null): string | null {
  const value = time?.attribs["datetime"] ?? "";
  return /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

export interface MesriListing {
  items: { path: string; cover: string | null }[];
  lastPage: number;
}

/** Articles of a listing page, each with the photo of its card, and the number of pages. */
export function parseMesriListing(html: string): MesriListing {
  const listing = parseDrupalListing(html, MESRI_ORIGIN, (path) => path.startsWith(ARTICLE_PATH));
  const pages = [...html.matchAll(/\/actualites\?page=(\d+)/g)].map((match) => Number(match[1]));
  return {
    items: listing.items.map((item) => ({
      path: item.path,
      cover:
        item.coverPath === null
          ? null
          : officialMediaUrl(new URL(item.coverPath, MESRI_ORIGIN).href),
    })),
    lastPage: Math.max(1, ...pages),
  };
}

export interface MesriArticle {
  title: string;
  publishedOn: string | null;
  section: string | null;
  bodyHtml: string;
  /** The page's main picture ("og:image", full size). */
  picture: string | null;
}

export function parseMesriArticle(html: string): MesriArticle | null {
  const document = parseDocument(html);
  const title = find(document.children, (element) => hasClass(element, "article-title"));
  const body = find(document.children, (element) => element.attribs["id"] === "article-body");
  if (title === null || body === null) {
    return null;
  }
  const head = find(document.children, (element) => hasClass(element, "article-head"));
  const time = head === null ? null : find([head], (element) => element.name === "time");
  const badge = find(document.children, (element) => hasClass(element, "badge-rub"));
  const picture = find(
    document.children,
    (element) => element.name === "meta" && element.attribs["property"] === "og:image",
  );
  return {
    title: DomUtils.textContent(title).replace(/\s+/g, " ").trim(),
    publishedOn: dayOf(time),
    section: /\/rubrique\/([a-z0-9-]+)/.exec(badge?.attribs["href"] ?? "")?.[1] ?? null,
    bodyHtml: body.children
      .filter((node) => !isTag(node) || node.name !== "script")
      .map((node) => render(node, { encodeEntities: "utf8" }))
      .join(""),
    picture: picture?.attribs["content"] ?? null,
  };
}

export function mesriArticleId(path: string): string {
  return stableUuid(`${MESRI_ORIGIN}${path}`);
}

export interface MesriProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createMesriProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: MesriProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "mesrisenegal.sn", fetchImpl, intervalMs });
  const page = (url: string) =>
    http.read(url, (response) => response.text(), { Accept: "text/html" });

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      const listing = parseMesriListing(
        await page(`${MESRI_ORIGIN}/actualites?page=${String(number)}`),
      );
      return {
        lastPage: Math.max(listing.lastPage, number),
        refs: listing.items.map((item): SourceArticleRef => ({
          sourceId: item.path,
          slug: item.path,
          lang,
          // The listing gives no change marker: an article is read once, as published.
          sourceUpdatedAt: "",
          coverSourceUrl: item.cover,
        })),
      };
    },

    articleIdFor: (ref) => mesriArticleId(ref.slug),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const sourceUrl = `${MESRI_ORIGIN}${ref.slug}`;
      const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
      const parsed = parseMesriArticle(await page(sourceUrl));
      if (parsed === null) {
        throw quarantine("no article in the page (site structure changed?)");
      }
      const title = plainLetters(parsed.title);
      const text = sanitizeNested(parsed.bodyHtml);
      // Many communiqués are a picture alone, given as the page's main picture.
      const picture = parsed.picture === null ? null : officialMediaUrl(parsed.picture);
      const bodyHtml =
        isEmptied(text) && picture !== null
          ? sanitizeNested(`<p><img src="${picture}" alt="" /></p>`)
          : text;
      if (title === "") {
        throw quarantine("article has no title");
      }
      const problem = unpublishable(title, bodyHtml, "fr");
      if (problem !== null) {
        throw quarantine(`article ${problem}`);
      }
      const category =
        parsed.section?.includes("communique") === true ? "communiques" : "actualites";
      const translations: NewsArticle["translations"] = [
        { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
      ];
      const candidate: NewsArticle = {
        id: mesriArticleId(ref.slug),
        kind: "news-article",
        publisher: "enseignement-superieur",
        alsoPublishedBy: [],
        category,
        sourceUrl,
        sourcePublishedOn: parsed.publishedOn,
        sourceUpdatedAt: null,
        fetchedAt: now().toISOString(),
        contentHash: articleContentHash(translations, parsed.publishedOn, category),
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
