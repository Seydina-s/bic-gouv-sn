import type { ArticleRepository, SaveOutcome } from "@bgs/content-store";
import { errorCodeOf, type Institution, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "./collect";
import { attachCover } from "./media/attach-cover";
import { attachDocuments } from "./media/attach-documents";
import { attachInlineImages } from "./media/attach-inline";
import type { AttachMedia } from "./media/attach-result";
import type { MediaStorage } from "./media/media-storage";
import { saveCollected } from "./duplicates/reconcile";
import { mergeArticle } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";

/**
 * Real-time detection (CLAUDE.md §4.4, freshness SLO < 2 min). Each pass reads the
 * first page of every language (one request each) and fetches only articles that
 * are new or whose source modification time changed since they were last seen,
 * then attaches their cover photo when a media storage is given. After an outage it
 * catches up page by page until it meets an article it already knew.
 */
export interface PollResult {
  outcomes: Record<SaveOutcome, number>;
  failures: CollectionReport["failures"];
  /** Seconds between the source's modification time and our detection, per saved article. */
  detectionDelays: number[];
}

/** Remembers, per language, the source modification time last processed for each item. */
export class SeenIndex {
  private readonly seen = new Map<string, string>();

  private static key(ref: SourceArticleRef): string {
    return `${ref.lang}:${String(ref.sourceId)}`;
  }

  isUnchanged(ref: SourceArticleRef): boolean {
    return this.seen.get(SeenIndex.key(ref)) === ref.sourceUpdatedAt;
  }

  remember(ref: SourceArticleRef): void {
    this.seen.set(SeenIndex.key(ref), ref.sourceUpdatedAt);
  }
}

/** Catch-up bound: 20 pages of 10 articles, far more than a day of publications. */
export const MAX_CATCH_UP_PAGES = 20;

export async function pollOnce(
  provider: SourceProvider,
  repository: ArticleRepository,
  langs: readonly Lang[],
  seen: SeenIndex,
  now: () => Date = () => new Date(),
  media: MediaStorage | null = null,
): Promise<PollResult> {
  const result: PollResult = {
    outcomes: { created: 0, updated: 0, unchanged: 0 },
    failures: [],
    detectionDelays: [],
  };
  for (const lang of langs) {
    for (let page = 1; page <= MAX_CATCH_UP_PAGES; page += 1) {
      const { refs, lastPage } = await provider.listPage(lang, page);
      let created = 0;
      for (const ref of refs.filter((candidate) => !seen.isUnchanged(candidate))) {
        try {
          const existing = await repository.get(provider.articleIdFor(ref));
          const outcome = await saveCollected(
            repository,
            mergeArticle(existing, await provider.fetchArticle(ref)),
          );
          result.outcomes[outcome] += 1;
          if (outcome === "created") {
            created += 1;
          }
          if (outcome !== "unchanged") {
            // Only a time measures freshness: a listed day alone would count hours.
            const changedAt = Date.parse(ref.sourceUpdatedAt);
            if (ref.sourceUpdatedAt.includes("T") && !Number.isNaN(changedAt)) {
              result.detectionDelays.push(Math.max(0, (now().getTime() - changedAt) / 1000));
            }
          }
          if (media !== null) {
            // Throws MediaProcessingError: the article stays saved but the ref is not
            // remembered, so the cover is retried on the next pass.
            await attachCover(ref, provider, repository, media);
            // Images in the text and official documents of a new or edited article:
            // failures are reported but never block the article; the inline-images and
            // documents jobs pick them up again. A known, unchanged article is left to
            // those jobs: after a restart, every first page is read again, and its
            // galleries would hold up the reference site for hours.
            const attachAll: AttachMedia[] =
              outcome === "unchanged"
                ? []
                : [
                    attachInlineImages,
                    (...args) => attachDocuments(...args, ref.documentUrls ?? []),
                  ];
            for (const attach of attachAll) {
              const saved = await repository.get(provider.articleIdFor(ref));
              if (saved !== null) {
                const { failures } = await attach(saved, provider, repository, media);
                for (const failure of failures) {
                  result.failures.push({
                    ref: ref.slug,
                    code: failure.code,
                    message: failure.message,
                  });
                }
              }
            }
          }
          seen.remember(ref);
        } catch (error) {
          result.failures.push({
            ref: ref.slug,
            code: errorCodeOf(error) ?? "UNKNOWN",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
      // Older pages only while everything on this one was new: after an outage, the
      // articles published meanwhile may have pushed unread ones past the first page.
      if (refs.length === 0 || created < refs.length || page >= lastPage) {
        break;
      }
    }
  }
  return result;
}

/** One official site the watcher follows, at its own pace. */
export interface WatchedSource {
  institution: Institution;
  /** Name in reports, e.g. "primature.sn". */
  name: string;
  provider: SourceProvider;
  langs: readonly Lang[];
  /** Least time between two passes on this site; 0 for every pass. */
  everyMs: number;
  /**
   * True for the reference source: its failure is the pass's failure (the console
   * then reports the collection as failing). Another site's failure is only listed.
   */
  essential: boolean;
  seen: SeenIndex;
  lastPassAt: Date | null;
}

/**
 * Sites to follow, from the WATCHED_SOURCES setting ("presidence,primature"): all of
 * them when it is unset. The reference site is always followed. Lets the team hold a
 * new institution back until the installed apps can show it, or pause a failing site.
 */
export function watchedFrom(
  sources: readonly WatchedSource[],
  setting: string | undefined,
): WatchedSource[] {
  if (setting === undefined || setting.trim() === "") {
    return [...sources];
  }
  const wanted = new Set(setting.split(",").map((id) => id.trim()));
  return sources.filter((source) => source.essential || wanted.has(source.institution));
}

function isDue(source: WatchedSource, now: Date): boolean {
  return (
    source.lastPassAt === null || now.getTime() - source.lastPassAt.getTime() >= source.everyMs
  );
}

/**
 * Sites read in a pass: every due reference site, then the one secondary site that
 * has waited longest. One secondary site per pass bounds how long a slow ministry
 * site keeps the reference one waiting (freshness SLO < 2 min); with a pass every
 * minute in the day, every secondary site still gets its turn on time.
 */
export function dueSources(sources: readonly WatchedSource[], now: Date): WatchedSource[] {
  const due = sources.filter((source) => isDue(source, now));
  const waitedLongest = due
    .filter((source) => !source.essential)
    .sort((a, b) => (a.lastPassAt?.getTime() ?? 0) - (b.lastPassAt?.getTime() ?? 0))
    .slice(0, 1);
  return [...due.filter((source) => source.essential), ...waitedLongest];
}

/**
 * One pass over the sites whose turn it is (CLAUDE.md §4.4): a site that fails never
 * keeps the others from being read, except the reference one, which fails the pass.
 */
export async function pollSources(
  sources: readonly WatchedSource[],
  repository: ArticleRepository,
  now: () => Date = () => new Date(),
  media: MediaStorage | null = null,
): Promise<PollResult> {
  const result: PollResult = {
    outcomes: { created: 0, updated: 0, unchanged: 0 },
    failures: [],
    detectionDelays: [],
  };
  for (const source of dueSources(sources, now())) {
    source.lastPassAt = now();
    try {
      const pass = await pollOnce(
        source.provider,
        repository,
        source.langs,
        source.seen,
        now,
        media,
      );
      for (const outcome of ["created", "updated", "unchanged"] as const) {
        result.outcomes[outcome] += pass.outcomes[outcome];
      }
      result.failures.push(...pass.failures);
      result.detectionDelays.push(...pass.detectionDelays);
    } catch (error) {
      if (source.essential) {
        throw error;
      }
      const code = errorCodeOf(error) ?? "UNKNOWN";
      result.failures.push({
        ref: source.name,
        // The console must not blame presidence.sn for another institution's site.
        code: code === "INGESTION_SOURCE_UNREACHABLE" ? "INGESTION_OTHER_SOURCE_UNREACHABLE" : code,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;

/** Waits between tries while the source fails: 1, 2, 5, then every 10 minutes. */
const RETRY_DELAYS_MS = [1 * MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE] as const;

/**
 * Next try after `failures` failing passes in a row. The watcher never gives up; it
 * only spaces its tries (politeness towards a struggling site). The longest wait
 * stays under the console's "collection stopped" threshold, so an outage of the
 * source is reported as such, not as a stopped watcher.
 */
export function retryDelayMs(failures: number): number {
  return (
    RETRY_DELAYS_MS[Math.min(Math.max(failures, 1), RETRY_DELAYS_MS.length) - 1] ?? 10 * MINUTE
  );
}

/**
 * Adaptive polling interval: fast right after a publication, steady during the day
 * in Dakar (UTC+0, publications happen then), slow at night. Politeness first.
 */
export function nextPollDelayMs(now: Date, lastChangeAt: Date | null): number {
  if (lastChangeAt !== null && now.getTime() - lastChangeAt.getTime() < 30 * 60 * SECOND) {
    return 30 * SECOND;
  }
  const hour = now.getUTCHours();
  return hour >= 7 && hour < 23 ? 60 * SECOND : 5 * 60 * SECOND;
}
