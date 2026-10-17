import type { Translation } from "@bgs/shared-types";
import { z } from "zod";
import { sanitizeArticleHtml, textLength } from "../lib/sanitize";

/*
 * Nothing the model writes is saved unchecked: the reply must be readable, keep the
 * article's structure and media exactly, and be about as long as the French. A
 * translation refused here is simply not saved; the article stays in French.
 */

/** Wolof runs a little longer than French; far outside this, something was lost or added. */
const LENGTH_RATIO = { min: 0.6, max: 2.2 } as const;

export type TranslationRefusal =
  "truncated" | "unreadable" | "empty" | "structure_changed" | "media_changed" | "length_off";

export type CheckedTranslation =
  { ok: true; title: string; bodyHtml: string } | { ok: false; refusal: TranslationRefusal };

const replySchema = z.object({
  title: z.string().trim().min(1).max(500),
  bodyHtml: z.string().trim().min(1),
});

/**
 * The blocks a reader sees, in order (paragraphs, headings, list items, quotes and
 * media): the shape a translation must keep. Emphasis and links inside a block may
 * move with the words, Wolof not ordering them as French does (08/10/2026); empty
 * paragraphs are not blocks a reader sees.
 */
function blockShape(html: string): string[] {
  const blocks = /<(p|h2|h3|h4|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<(img|iframe)\b/g;
  return [...sanitizeArticleHtml(html).matchAll(blocks)].flatMap((match) => {
    const media = match[3];
    if (media !== undefined) {
      return [media];
    }
    const inner = match[2] ?? "";
    const seen = textLength(inner) > 0 || /<(img|iframe)\b/.test(inner);
    return seen ? [match[1] ?? ""] : [];
  });
}

/** Image and frame addresses, in order: never changed by a translation. */
function mediaSources(html: string): string[] {
  return [...html.matchAll(/<(?:img|iframe)\b[^>]*\bsrc="([^"]*)"/g)].map(
    (match) => match[1] ?? "",
  );
}

/** The JSON object of a reply, read with `schema`; null when it cannot be. */
export function readJsonReply<T>(text: string, schema: z.ZodType<T>): T | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    return null;
  }
  try {
    const parsed = schema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function refused(refusal: TranslationRefusal): { ok: false; refusal: TranslationRefusal } {
  return { ok: false, refusal };
}

/**
 * A translated HTML text, cleaned like any article, when it keeps the French one's
 * blocks and media and is not empty; else why it is refused.
 */
export function checkHtml(
  frenchHtml: string,
  html: string,
): { ok: true; html: string } | { ok: false; refusal: TranslationRefusal } {
  const clean = sanitizeArticleHtml(html);
  if (textLength(clean) === 0 && textLength(frenchHtml) > 0) {
    return refused("empty");
  }
  if (blockShape(clean).join(" ") !== blockShape(frenchHtml).join(" ")) {
    return refused("structure_changed");
  }
  if (mediaSources(clean).join(" ") !== mediaSources(frenchHtml).join(" ")) {
    return refused("media_changed");
  }
  return { ok: true, html: clean };
}

/** The translation's length (in characters of text) far from the French one's. */
export function lengthOff(frenchText: number, translatedText: number): boolean {
  if (frenchText === 0) {
    return false;
  }
  const ratio = translatedText / frenchText;
  return ratio < LENGTH_RATIO.min || ratio > LENGTH_RATIO.max;
}

/** The model's reply for `french`, cleaned like any article, or why it is refused. */
export function checkTranslation(
  french: Pick<Translation, "title" | "bodyHtml">,
  reply: string,
): CheckedTranslation {
  const parsed = readJsonReply(reply, replySchema);
  if (parsed === null) {
    return refused("unreadable");
  }
  const body = checkHtml(french.bodyHtml, parsed.bodyHtml);
  if (!body.ok) {
    return body;
  }
  if (lengthOff(textLength(french.bodyHtml), textLength(body.html))) {
    return refused("length_off");
  }
  return { ok: true, title: parsed.title, bodyHtml: body.html };
}
