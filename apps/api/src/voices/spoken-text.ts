import { createHash } from "node:crypto";
import type { AudioTrack, Lang, NewsArticle, Translation } from "@bgs/shared-types";
import { paragraphsOf } from "../assistant/passages";

/*
 * What our voices read for one language version of an article: its title, then each
 * paragraph, heading or list item, as the "Écouter" button reads it in the app. The
 * hash of these words ties a recording to the text it reads: once the text changes
 * (a correction at the source, a reviewed translation), the old recording is no
 * longer offered and a new one is made.
 */

export function spokenPieces(translation: Pick<Translation, "title" | "bodyHtml">): string[] {
  return [translation.title, ...paragraphsOf(translation.bodyHtml)];
}

export function spokenTextHash(pieces: readonly string[]): string {
  return createHash("sha256").update(JSON.stringify(pieces), "utf8").digest("hex");
}

/** The recording of this version, if one was made for its current words. */
export function currentRecording(
  article: Pick<NewsArticle, "audio">,
  lang: Lang,
  translation: Pick<Translation, "title" | "bodyHtml">,
): AudioTrack | null {
  const hash = spokenTextHash(spokenPieces(translation));
  return article.audio.find((track) => track.lang === lang && track.textHash === hash) ?? null;
}
