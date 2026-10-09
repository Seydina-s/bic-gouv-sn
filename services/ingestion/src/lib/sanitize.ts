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
  return plainLetters(sanitizeHtml(html, OPTIONS))
    .replace(/(<br \/>\s*)+<\/p>/g, "</p>")
    .replace(/<p>(\s|<br \/>)*<\/p>/g, "")
    .trim();
}

/**
 * Letters as people type them: decorative "mathematical" letters (pasted from social
 * networks, and read one symbol at a time by screen readers) become ordinary letters,
 * and accents written apart from their letter are joined to it.
 */
export function plainLetters(text: string): string {
  return text
    .replace(/[\u{1D400}-\u{1D7FF}]/gu, (letter) => letter.normalize("NFKC"))
    .normalize("NFC");
}

const FRENCH_ACCENTS = /[àâäçéèêëîïôöùûüÿœæÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ]/gu;

/**
 * Why a French text looks damaged at its source (letters lost or replaced by "?"
 * when the site was migrated), or null. Measured on 09/10/2026: published French
 * texts have at least 0.8 % accented letters, damaged ones none; no published
 * article of presidence.sn or primature.sn is caught.
 */
export function damageIn(html: string): string | null {
  const text = plainLetters(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ");
  const replaced = text.match(/\p{L}\?{1,2}\p{L}/gu)?.length ?? 0;
  if (replaced >= 3) {
    return `${String(replaced)} letters replaced by "?"`;
  }
  const letters = text.match(/\p{L}/gu)?.length ?? 0;
  const accented = text.match(FRENCH_ACCENTS)?.length ?? 0;
  return letters >= 300 && accented / letters < 0.003
    ? "French text without accents (characters lost at the source)"
    : null;
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

/** Below this, a news article without official media is considered emptied. */
const MIN_NEWS_TEXT_LENGTH = 40;

/** True when a sanitized news article has neither enough text nor official media. */
export function isEmptied(bodyHtml: string): boolean {
  return (
    textLength(bodyHtml) < MIN_NEWS_TEXT_LENGTH &&
    !hasOfficialMedia(bodyHtml) &&
    !hasOfficialDocument(bodyHtml)
  );
}

/**
 * True when the sanitized text links an official PDF: some communiqués are the
 * document alone ("Télécharger"), shown in the app under "Documents officiels".
 */
export function hasOfficialDocument(html: string): boolean {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)].some((match) => {
    const url = officialMediaUrl((match[1] ?? "").replaceAll("&amp;", "&"));
    return url !== null && new URL(url).pathname.toLowerCase().endsWith(".pdf");
  });
}

/**
 * Why a sanitized news text cannot be published (it would mislead or show nothing),
 * or null. Shared by every news source: emptied, or French damaged at the source.
 */
export function unpublishable(title: string, bodyHtml: string, lang: string): string | null {
  if (isEmptied(bodyHtml)) {
    return "body is empty after sanitization";
  }
  return lang === "fr" ? damageIn(`${title} ${bodyHtml}`) : null;
}
