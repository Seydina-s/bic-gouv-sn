import { officialMediaUrl, youtubeVideoId } from "@bgs/shared-types";
import sanitizeHtml from "sanitize-html";

/**
 * Strict allowlist for scraped HTML (CLAUDE.md §4.5): structure only, no styles,
 * classes, scripts or event handlers; links and images over HTTPS only.
 * The source wraps paragraphs in <div> (text pasted from social networks):
 * they become <p>, and empty blocks are dropped.
 * The only frames kept are YouTube embeds published by the official site (some
 * interviews are video only); they are normalised to the privacy-enhanced host.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "em",
    "u",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "a",
    "img",
    "iframe",
  ],
  allowedAttributes: { a: ["href"], img: ["src", "alt"], iframe: ["src"] },
  allowedSchemes: ["https"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
  transformTags: {
    div: "p",
    b: "strong",
    i: "em",
    h1: "h2",
    iframe: (_tagName, attribs) => {
      // The source also writes protocol-relative embeds ("//www.youtube.com/...").
      const src = attribs["src"] ?? "";
      const id = youtubeVideoId(src.startsWith("//") ? `https:${src}` : src);
      return {
        tagName: "iframe",
        attribs: id === null ? {} : { src: `https://www.youtube-nocookie.com/embed/${id}` },
      };
    },
  },
  exclusiveFilter: (frame) =>
    (frame.tag === "iframe" && frame.attribs["src"] === undefined) ||
    (frame.tag === "p" && frame.text.trim() === "" && !frame.mediaChildren.length),
  nonTextTags: ["script", "style", "textarea", "noscript"],
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS)
    .replace(/(<br \/>\s*)+<\/p>/g, "</p>")
    .replace(/<p>(\s|<br \/>)*<\/p>/g, "")
    .trim();
}

/** Visible text length, to detect articles emptied by the source or by sanitization. */
export function textLength(html: string): number {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim().length;
}

/** True when the sanitized article carries an official video. */
export function hasVideo(html: string): boolean {
  return html.includes("<iframe ");
}

/**
 * True when the sanitized article carries an official image or video: some
 * articles are a single scanned press page or an interview, with no text.
 */
export function hasOfficialMedia(html: string): boolean {
  return (
    hasVideo(html) ||
    [...html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)].some(
      (match) => officialMediaUrl((match[1] ?? "").replaceAll("&amp;", "&")) !== null,
    )
  );
}
