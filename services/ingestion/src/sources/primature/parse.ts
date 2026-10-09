import type { ChildNode, Element } from "domhandler";
import render from "dom-serializer";
import { DomUtils, parseDocument } from "htmlparser2";
import { frenchDate } from "../../lib/french-date";

/*
 * Reads the pages of primature.sn (Drupal, no feed and no API, docs/sources.md):
 * the news listing ("?page=N", nine items a page) and an article page. Only what the
 * site shows is read; anything missing stays missing (never guessed).
 */

export const PRIMATURE_ORIGIN = "https://primature.sn";
export const NEWS_PATH = "/publications/actualites";

function hasClass(element: Element, name: string): boolean {
  return (element.attribs["class"] ?? "").split(/\s+/).includes(name);
}

function findByClass(nodes: ChildNode[], name: string): Element | null {
  return DomUtils.findOne((element) => hasClass(element, name), nodes);
}

/** Absolute address on the site of a link or image as written in its pages. */
function absolute(path: string): string | null {
  try {
    return new URL(path, PRIMATURE_ORIGIN).href;
  } catch {
    return null;
  }
}

export interface ListingItem {
  slug: string;
  /** Day shown under the title (the site's last revision of the article). */
  publishedOn: string | null;
  /** Full-size photo of the item, as the listing links it. */
  coverUrl: string | null;
}

export interface ListingPage {
  items: ListingItem[];
  /** Index of the last listing page ("?page=41"), 0 when there is a single page. */
  lastPageIndex: number;
}

function listingItem(row: Element): ListingItem | null {
  const link = DomUtils.findOne(
    (element) =>
      element.name === "a" && (element.attribs["href"] ?? "").startsWith(`${NEWS_PATH}/`),
    row.children,
  );
  const slug = link?.attribs["href"]?.slice(NEWS_PATH.length + 1) ?? "";
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return null;
  }
  const posted = findByClass(row.children, "card-posted");
  const image = DomUtils.findOne((element) => element.name === "img", row.children);
  const src = image?.attribs["src"];
  return {
    slug,
    publishedOn: posted === null ? null : frenchDate(DomUtils.textContent(posted)),
    coverUrl: src === undefined ? null : absolute(src),
  };
}

export function parseListingPage(html: string): ListingPage {
  const document = parseDocument(html);
  const rows = DomUtils.findAll((element) => hasClass(element, "views-row"), document.children);
  const last = findByClass(document.children, "pager__item--last");
  const lastHref =
    last === null
      ? undefined
      : DomUtils.findOne((element) => element.name === "a", last.children)?.attribs["href"];
  return {
    items: rows.map(listingItem).filter((item): item is ListingItem => item !== null),
    lastPageIndex: Number(/[?&]page=(\d+)/.exec(lastHref ?? "")?.[1] ?? "0"),
  };
}

export interface ArticlePage {
  title: string;
  /** Body as published, links and images made absolute; sanitized by the caller. */
  bodyHtml: string;
  /** Full-size main photo, when the article has one. */
  imageUrl: string | null;
}

/** "/sites/default/files/styles/large/public/2026-09/a.jpg?itok=x" → the original file. */
function originalImage(src: string): string | null {
  return absolute(src.replace(/\/styles\/[^/]+\/public\//, "/").replace(/\?.*$/, ""));
}

function makeAbsolute(nodes: ChildNode[]): void {
  for (const element of DomUtils.findAll(() => true, nodes)) {
    for (const attribute of ["href", "src"] as const) {
      const value = element.attribs[attribute];
      if (value !== undefined) {
        element.attribs[attribute] = absolute(value) ?? "";
      }
    }
  }
}

/** The article in its page, or null when the page has no article where expected. */
export function parseArticlePage(html: string): ArticlePage | null {
  const document = parseDocument(html);
  const article = DomUtils.findOne(
    (element) => element.name === "article" && hasClass(element, "node--view-mode-full"),
    document.children,
  );
  if (article === null) {
    return null;
  }
  const name = DomUtils.findOne(
    (element) => element.attribs["property"] === "schema:name",
    article.children,
  );
  const body = findByClass(article.children, "field--name-body");
  const imageField = findByClass(article.children, "field--name-field-image");
  const image =
    imageField === null
      ? null
      : DomUtils.findOne((element) => element.name === "img", imageField.children);
  if (body === null) {
    return null;
  }
  makeAbsolute(body.children);
  const src = image?.attribs["src"];
  return {
    title: (name?.attribs["content"] ?? "").trim(),
    bodyHtml: body.children.map((node) => render(node, { encodeEntities: "utf8" })).join(""),
    imageUrl: src === undefined ? null : originalImage(src),
  };
}
