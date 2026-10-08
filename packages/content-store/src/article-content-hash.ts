import { createHash } from "node:crypto";
import type { NewsArticle } from "@bgs/shared-types";

/**
 * Hash of what the reader sees: every translation (its status included, so a
 * reviewed translation is a new version), the day and the section. Shared by the
 * collection and the console's reviews so both version an article the same way.
 */
export function articleContentHash(
  translations: NewsArticle["translations"],
  publishedOn: string | null,
  category: string,
): string {
  const ordered = [...translations]
    .sort((a, b) => a.lang.localeCompare(b.lang))
    .map(({ lang, status, title, bodyHtml }) => ({ lang, status, title, bodyHtml }));
  return createHash("sha256")
    .update(JSON.stringify({ translations: ordered, publishedOn, category }), "utf8")
    .digest("hex");
}
