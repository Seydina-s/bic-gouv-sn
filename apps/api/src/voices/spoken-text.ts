import { createHash } from "node:crypto";
import type { AudioTrack, Lang, NewsArticle, Translation } from "@bgs/shared-types";
import { paragraphsOf } from "../assistant/passages";
import { FRENCH_LEXICON } from "./french-lexicon";

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

/**
 * The French voice and its readings, part of what a French recording is made of: a new
 * voice or a new lexicon version makes the recordings again (the Wolof hash is the
 * words alone, as before).
 */
const FRENCH_READING = `kokoro-ff_siwis/lexicon-${String(FRENCH_LEXICON.version)}`;

/** What ties a recording to its words, and in French to the way they are read. */
export function recordingHash(lang: Lang, pieces: readonly string[]): string {
  return spokenTextHash(lang === "fr" ? [...pieces, FRENCH_READING] : pieces);
}

/** The recording of this version, if one was made for its current words. */
export function currentRecording(
  article: Pick<NewsArticle, "audio">,
  lang: Lang,
  translation: Pick<Translation, "title" | "bodyHtml">,
): AudioTrack | null {
  const hash = recordingHash(lang, spokenPieces(translation));
  return article.audio.find((track) => track.lang === lang && track.textHash === hash) ?? null;
}
