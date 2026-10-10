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
  // The highest page linked by the pager (Drupal 9 has no "last page" link).
  const pages = DomUtils.findAll((element) => element.name === "a", document.children).map(
    (anchor) => Number(/[?&]page=(\d+)/.exec(anchor.attribs["href"] ?? "")?.[1] ?? "0"),
  );
  return { items: [...items.values()], lastPageIndex: Math.max(0, ...pages) };
}

export interface DrupalArticle {
  title: string;
  bodyHtml: string;
  imagePath: string | null;
  /** Day the page shows ("jeu 08/10/2026 - 17:35", Drupal 9 "created" field), when shown. */
  publishedOn: string | null;
}

/** "jeu 08/10/2026 - 17:35" → "2026-10-08"; null for anything else. */
export function createdDay(text: string): string | null {
  const match = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(text);
  if (match === null) {
    return null;
  }
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCDate() === day && date.getUTCMonth() === month - 1
    ? date.toISOString().slice(0, 10)
    : null;
}

/**
 * The text container of a page: Drupal 7 puts it in "field-name-body > field-items",
 * Drupal 9 in the "field--name-body" field itself.
 */
function bodyOf(nodes: ChildNode[]): Element | null {
  const legacy = findByClass(nodes, "field-name-body");
  return legacy === null
    ? findByClass(nodes, "field--name-body")
    : findByClass(legacy.children, "field-items");
}

/** The article of a page: title from the page head, text from its "body" field. */
export function parseDrupalArticle(html: string): DrupalArticle | null {
  const document = parseDocument(html);
  const head = DomUtils.findOne((element) => element.name === "title", document.children);
  const title = (head === null ? "" : DomUtils.textContent(head)).split(" | ")[0]?.trim() ?? "";
  const body = bodyOf(document.children);
  if (body === null) {
    return null;
  }
  const imageField =
    findByClass(document.children, "field-name-field-image") ??
    findByClass(document.children, "field--name-field-image");
  const image =
    imageField === null
      ? null
      : DomUtils.findOne((element) => element.name === "img", imageField.children);
  const created = findByClass(document.children, "field--name-created");
  return {
    title,
    bodyHtml: body.children.map((node) => render(node, { encodeEntities: "utf8" })).join(""),
    imagePath: image?.attribs["src"] ?? null,
    publishedOn: created === null ? null : createdDay(DomUtils.textContent(created)),
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
