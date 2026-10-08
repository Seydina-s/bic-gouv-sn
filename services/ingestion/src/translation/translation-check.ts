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
  "unreadable" | "empty" | "structure_changed" | "media_changed" | "length_off";

export type CheckedTranslation =
  { ok: true; title: string; bodyHtml: string } | { ok: false; refusal: TranslationRefusal };

const replySchema = z.object({
  title: z.string().trim().min(1).max(500),
  bodyHtml: z.string().trim().min(1),
});

/** The tags, in order: the shape a translation must keep. */
function tagSequence(html: string): string[] {
  return [...html.matchAll(/<([a-z0-9]+)\b/g)].map((match) => match[1] ?? "");
}

/** Image and frame addresses, in order: never changed by a translation. */
function mediaSources(html: string): string[] {
  return [...html.matchAll(/<(?:img|iframe)\b[^>]*\bsrc="([^"]*)"/g)].map(
    (match) => match[1] ?? "",
  );
}

function readReply(text: string): z.infer<typeof replySchema> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) {
    return null;
  }
  try {
    const parsed = replySchema.safeParse(JSON.parse(text.slice(start, end + 1)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function refused(refusal: TranslationRefusal): CheckedTranslation {
  return { ok: false, refusal };
}

/** The model's reply for `french`, cleaned like any article, or why it is refused. */
export function checkTranslation(
  french: Pick<Translation, "title" | "bodyHtml">,
  reply: string,
): CheckedTranslation {
  const parsed = readReply(reply);
  if (parsed === null) {
    return refused("unreadable");
  }
  const bodyHtml = sanitizeArticleHtml(parsed.bodyHtml);
  const frenchText = textLength(french.bodyHtml);
  const wolofText = textLength(bodyHtml);
  if (wolofText === 0 && frenchText > 0) {
    return refused("empty");
  }
  if (tagSequence(bodyHtml).join(" ") !== tagSequence(french.bodyHtml).join(" ")) {
    return refused("structure_changed");
  }
  if (mediaSources(bodyHtml).join(" ") !== mediaSources(french.bodyHtml).join(" ")) {
    return refused("media_changed");
  }
  if (frenchText > 0) {
    const ratio = wolofText / frenchText;
    if (ratio < LENGTH_RATIO.min || ratio > LENGTH_RATIO.max) {
      return refused("length_off");
    }
  }
  return { ok: true, title: parsed.title, bodyHtml };
}
