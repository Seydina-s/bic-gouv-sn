import type { ArticleRepository, SaveOutcome } from "@bgs/content-store";
import { errorCodeOf, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "./collect";
import { attachCover } from "./media/attach-cover";
import { attachDocuments } from "./media/attach-documents";
import { attachInlineImages } from "./media/attach-inline";
import type { AttachMedia } from "./media/attach-result";
import type { MediaStorage } from "./media/media-storage";
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
          const outcome = await repository.save(
            mergeArticle(existing, await provider.fetchArticle(ref)),
          );
          result.outcomes[outcome] += 1;
          if (outcome === "created") {
            created += 1;
          }
          if (outcome !== "unchanged") {
            const changedAt = Date.parse(ref.sourceUpdatedAt);
            if (!Number.isNaN(changedAt)) {
              result.detectionDelays.push(Math.max(0, (now().getTime() - changedAt) / 1000));
            }
          }
          if (media !== null) {
            // Throws MediaProcessingError: the article stays saved but the ref is not
            // remembered, so the cover is retried on the next pass.
            await attachCover(ref, provider, repository, media);
            // Images in the text and official documents: failures are reported but never
            // block the article; the inline-images and documents jobs pick them up again.
            const attachAll: AttachMedia[] = [
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
