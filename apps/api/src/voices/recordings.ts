import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { ArticleRepository } from "@bgs/content-store";
import { publishedTranslation, type Lang, type NewsArticle } from "@bgs/shared-types";
import { readAloudFrench } from "./french-reading";
import { currentRecording, recordingHash, spokenPieces } from "./spoken-text";

/*
 * Each article is read aloud once per language by our voices (workflow of 03/10/2026:
 * Jessica in French then Kokoro from 10/10/2026, Adia in Wolof), stored like the photos, then served to everyone
 * from the media storage. Newest articles first; a recording whose words changed is
 * made again. Wolof machine translations are read too: they keep their label.
 */

const PAGE_SIZE = 200;

export interface SynthesisJob {
  id: string;
  lang: Lang;
  pieces: string[];
  /** Where to write the MP3. */
  out: string;
}

export type SynthesisResult =
  | { id: string; ok: true; durationMs: number; bytes: number; voiceId: string }
  | { id: string; ok: false; error: string };

/** Reads the jobs aloud (our Python voices); one result per job, in any order. */
export type Synthesizer = (jobs: readonly SynthesisJob[]) => Promise<SynthesisResult[]>;

export interface Recording {
  article: NewsArticle;
  lang: Lang;
  pieces: string[];
  textHash: string;
  /** Where it is stored, relative to the media root. */
  key: string;
}

export async function allArticles(articles: ArticleRepository): Promise<NewsArticle[]> {
  const all: NewsArticle[] = [];
  let cursor: string | undefined;
  do {
    const page = await articles.list({ limit: PAGE_SIZE, cursor });
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor !== undefined);
  return all;
}

/** The versions without a recording of their current words, newest first. */
export function recordingsToMake(
  articles: readonly NewsArticle[],
  langs: readonly Lang[],
  limit: number,
): Recording[] {
  const todo: Recording[] = [];
  for (const article of articles) {
    for (const lang of langs) {
      const translation = publishedTranslation(article, lang);
      if (translation === undefined || currentRecording(article, lang, translation) !== null) {
        continue;
      }
      const written = spokenPieces(translation);
      const textHash = recordingHash(lang, written);
      // What the voice says: in French, abbreviations and acronyms read out.
      const pieces = lang === "fr" ? written.map((piece) => readAloudFrench(piece)) : written;
      todo.push({
        article,
        lang,
        pieces,
        textHash,
        key: `audio/${article.id}/${lang}-${textHash.slice(0, 16)}.mp3`,
      });
      if (todo.length >= limit) {
        return todo;
      }
    }
  }
  return todo;
}

export interface RecordReport {
  recorded: number;
  failed: { id: string; lang: Lang; error: string }[];
  audioMs: number;
}

/** Reads `todo` aloud in groups, attaching each recording as soon as its group ends. */
export async function record(
  todo: readonly Recording[],
  options: {
    articles: ArticleRepository;
    mediaRoot: string;
    synthesize: Synthesizer;
    /** Recordings per call: one model load serves them all. */
    groupSize?: number;
    now?: () => Date;
    onProgress?: (done: number, total: number) => void;
  },
): Promise<RecordReport> {
  const report: RecordReport = { recorded: 0, failed: [], audioMs: 0 };
  const groupSize = options.groupSize ?? 10;
  const now = options.now ?? (() => new Date());
  for (let start = 0; start < todo.length; start += groupSize) {
    const group = todo.slice(start, start + groupSize);
    const byId = new Map(group.map((item) => [`${item.article.id}:${item.lang}`, item]));
    const results = await options.synthesize(
      group.map((item) => ({
        id: `${item.article.id}:${item.lang}`,
        lang: item.lang,
        pieces: item.pieces,
        out: join(options.mediaRoot, item.key),
      })),
    );
    for (const result of results) {
      const item = byId.get(result.id);
      if (item === undefined) {
        continue;
      }
      if (!result.ok) {
        report.failed.push({ id: item.article.id, lang: item.lang, error: result.error });
        continue;
      }
      // The file must really be there before the app is told about it.
      const bytes = (await stat(join(options.mediaRoot, item.key))).size;
      await options.articles.setAudioTrack(item.article.id, {
        lang: item.lang,
        origin: "tts",
        key: item.key,
        format: "mp3",
        durationMs: result.durationMs,
        bytes,
        voiceId: result.voiceId,
        textHash: item.textHash,
        createdAt: now().toISOString(),
      });
      report.recorded += 1;
      report.audioMs += result.durationMs;
    }
    options.onProgress?.(Math.min(start + groupSize, todo.length), todo.length);
  }
  return report;
}
