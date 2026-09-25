import sanitizeHtml from "sanitize-html";

/**
 * Strict allowlist for scraped HTML (CLAUDE.md §4.5): structure only, no styles,
 * classes, scripts or event handlers; links and images over HTTPS only.
 * The source wraps paragraphs in <div> (text pasted from social networks):
 * they become <p>, and empty blocks are dropped.
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
  ],
  allowedAttributes: { a: ["href"], img: ["src", "alt"] },
  allowedSchemes: ["https"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  transformTags: {
    div: "p",
    b: "strong",
    i: "em",
    h1: "h2",
  },
  exclusiveFilter: (frame) =>
    frame.tag === "p" && frame.text.trim() === "" && !frame.mediaChildren.length,
  nonTextTags: ["script", "style", "textarea", "noscript", "iframe"],
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
