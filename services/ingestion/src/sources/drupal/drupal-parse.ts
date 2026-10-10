import { isTag, type ChildNode, type Element } from "domhandler";
import render from "dom-serializer";
import { DomUtils, parseDocument } from "htmlparser2";
import { frenchDate } from "../../lib/french-date";

/*
 * Pages of ministry sites built with Drupal 7 (sante.gouv.sn, forcesarmees.gouv.sn):
 * section listings ("?page=N") and article pages, read as the site shows them.
 */

export interface DrupalListing {
  /** Article paths in the order listed, with the day the row shows when it has one. */
  items: { path: string; publishedOn: string | null; coverPath: string | null }[];
  /** Index of the last listing page ("?page=32"), 0 for a single page. */
  lastPageIndex: number;
}

function hasClass(element: Element, name: string): boolean {
  return (element.attribs["class"] ?? "").split(/\s+/).includes(name);
}

function findByClass(nodes: ChildNode[], name: string): Element | null {
  return DomUtils.findOne((element) => hasClass(element, name), nodes);
}

/** The path of a link, without its site part ("/actualites/x"), or null. */
function pathOf(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    return url.origin === new URL(origin).origin ? url.pathname : null;
  } catch {
    return null;
  }
}

/**
 * The row of an article in a listing: its nearest container holding no other
 * article. The day shown there ("8 août 2026", class "views-field-created") and its
 * photo belong to it.
 */
function rowOf(link: Element, isArticle: (path: string) => boolean, origin: string): Element {
  let row: Element = link;
  for (let parent = link.parent; parent !== null && isTag(parent); parent = parent.parent) {
    const paths = new Set(
      DomUtils.findAll((element) => element.name === "a", [parent])
        .map((anchor) => pathOf(anchor.attribs["href"] ?? "", origin))
        .filter((path): path is string => path !== null && isArticle(path)),
    );
    if (paths.size > 1) {
      return row;
    }
    row = parent;
  }
  return row;
}

export function parseDrupalListing(
  html: string,
  origin: string,
  isArticle: (path: string) => boolean,
): DrupalListing {
  const document = parseDocument(html);
  // In listing order; an article linked twice (a news ticker, then its card) takes the
  // day and photo of whichever row shows them.
  const items = new Map<string, DrupalListing["items"][number]>();
  for (const link of DomUtils.findAll((element) => element.name === "a", document.children)) {
    const path = pathOf(link.attribs["href"] ?? "", origin);
    if (path === null || !isArticle(path)) {
      continue;
    }
    const row = rowOf(link, isArticle, origin);
    const created = findByClass([row], "views-field-created");
    const image = DomUtils.findOne((element) => element.name === "img", [row]);
    const known = items.get(path);
    items.set(path, {
      path,
      publishedOn:
        known?.publishedOn ?? (created === null ? null : frenchDate(DomUtils.textContent(created))),
      coverPath: known?.coverPath ?? image?.attribs["src"] ?? null,
    });
  }
  const last = DomUtils.findOne(
    (element) => element.name === "a" && /dernière page/i.test(element.attribs["title"] ?? ""),
    document.children,
  );
  return {
    items: [...items.values()],
    lastPageIndex: Number(/[?&]page=(\d+)/.exec(last?.attribs["href"] ?? "")?.[1] ?? "0"),
  };
}

export interface DrupalArticle {
  title: string;
  bodyHtml: string;
  imagePath: string | null;
}

/** The article of a page: title from the page head, text from its "body" field. */
export function parseDrupalArticle(html: string): DrupalArticle | null {
  const document = parseDocument(html);
  const head = DomUtils.findOne((element) => element.name === "title", document.children);
  const title = (head === null ? "" : DomUtils.textContent(head)).split(" | ")[0]?.trim() ?? "";
  const body = findByClass(document.children, "field-name-body");
  const items = body === null ? null : findByClass(body.children, "field-items");
  if (items === null) {
    return null;
  }
  const imageField = findByClass(document.children, "field-name-field-image");
  const image =
    imageField === null
      ? null
      : DomUtils.findOne((element) => element.name === "img", imageField.children);
  return {
    title,
    bodyHtml: items.children.map((node) => render(node, { encodeEntities: "utf8" })).join(""),
    imagePath: image?.attribs["src"] ?? null,
  };
}

/** Day of each article link of an RSS feed ("<link>" → its "<pubDate>", in UTC). */
export function feedDays(xml: string): Map<string, string> {
  const days = new Map<string, string>();
  for (const [, item = ""] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const link = /<link>([^<]+)<\/link>/.exec(item)?.[1]?.trim();
    const published = Date.parse(/<pubDate>([^<]+)<\/pubDate>/.exec(item)?.[1] ?? "");
    if (link !== undefined && !Number.isNaN(published)) {
      try {
        days.set(new URL(link).pathname, new Date(published).toISOString().slice(0, 10));
      } catch {
        // A link that is not an address is not an article.
      }
    }
  }
  return days;
}
