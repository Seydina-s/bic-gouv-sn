import type { ChildNode, Element } from "domhandler";
import render from "dom-serializer";
import { DomUtils, parseDocument } from "htmlparser2";

/*
 * Ministry sites built with WordPress page builders put more than the article in a
 * post's content: builder codes (Divi), the site's own blocks (search box, category
 * list, related posts, menus), the title and the cover photo again. Only the
 * article's own words and pictures are kept; nothing is rewritten.
 */

export interface CleanupRules {
  /** Blocks of the page that are not the article, by one of their classes. */
  dropClasses: readonly RegExp[];
  /** Whole elements whose text is only one of these (e.g. a sidebar title). */
  dropTexts: readonly string[];
}

/** Codes of the page builders seen on ministry sites: Divi, WPBakery, Avada. */
const BUILDER_CODES = /\[\/?(?:et_pb|vc|fusion)_[a-z0-9_]*(?:\s[^\]]*)?\]/gi;

/**
 * A Divi video or image code and its address. The site writes its quotes as a
 * no-break space and a guillemet ("src= \u00bbhttps://youtu.be/… \u00bb").
 */
const BUILDER_MEDIA =
  /\[et_pb_(video|image)\b[^\]]*?\bsrc=[^h\]]*(https:\/\/[^\s"\u00a0\u00bb\]&]+)[^\]]*\]/g;

/** YouTube video id of a watch, short or embed address, or null. */
export function youtubeIdOf(url: string): string | null {
  return (
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([A-Za-z0-9_-]{11})/.exec(url)?.[1] ?? null
  );
}

/** The builder's video and image codes become the elements they stand for. */
export function builderMedia(html: string): string {
  return html.replace(BUILDER_MEDIA, (code, kind: string, url: string) => {
    if (kind === "image") {
      return `<img src="${url}" alt="" />`;
    }
    const id = youtubeIdOf(url);
    return id === null ? code : `<iframe src="https://www.youtube.com/embed/${id}"></iframe>`;
  });
}

/** Blocks that are never the article, whatever the site. */
const ALWAYS_DROPPED: readonly RegExp[] = [
  /^menu$/,
  /nav-menu/,
  /search-form/,
  /sidebar/,
  /share/,
  // A list of other posts placed in the text (WordPress "query loop" block).
  /^wp-block-query$/,
];

function normalized(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function classes(element: Element): string[] {
  return (element.attribs["class"] ?? "").split(/\s+/).filter(Boolean);
}

function isDropped(element: Element, rules: CleanupRules, title: string, cover: string | null) {
  const text = normalized(DomUtils.textContent(element));
  if (
    [...ALWAYS_DROPPED, ...rules.dropClasses].some((rule) =>
      classes(element).some((name) => rule.test(name)),
    )
  ) {
    return true;
  }
  if (["form", "nav", "script", "style"].includes(element.name)) {
    return true;
  }
  if (/^h[1-6]$/.test(element.name) && (text === "" || text === normalized(title))) {
    return true;
  }
  if (text !== "" && rules.dropTexts.some((dropped) => normalized(dropped) === text)) {
    return true;
  }
  const src = element.name === "img" ? (element.attribs["src"] ?? "") : null;
  return src !== null && cover !== null && src.split("?")[0] === cover.split("?")[0];
}

function prune(nodes: ChildNode[], rules: CleanupRules, title: string, cover: string | null) {
  for (const element of DomUtils.findAll(() => true, nodes)) {
    if (element.parent !== null && isDropped(element, rules, title, cover)) {
      DomUtils.removeElement(element);
    }
  }
}

/** The article's own content, before the common sanitization. */
export function articleContent(
  html: string,
  title: string,
  cover: string | null,
  rules: CleanupRules,
): string {
  const document = parseDocument(builderMedia(html).replace(BUILDER_CODES, ""));
  prune(document.children, rules, title, cover);
  return render(document, { encodeEntities: "utf8" });
}

/**
 * Paragraphs written as lines separated by blank lines ("text<br><br>text") become
 * paragraphs of their own, as people read them.
 */
export function splitBlankLines(sanitized: string): string {
  return sanitized.replace(/<p>([\s\S]*?)<\/p>/g, (_paragraph, inner: string) =>
    inner
      .split(/(?:<br \/>\s*){2,}/)
      .map((part) => part.replace(/^(?:\s|<br \/>)+|(?:\s|<br \/>)+$/g, ""))
      .filter((part) => part !== "")
      .map((part) => `<p>${part}</p>`)
      .join(""),
  );
}
