import type { ArticleRepository, SaveOutcome } from "@bgs/content-store";
import { errorCodeOf, type Lang } from "@bgs/shared-types";
import type { CollectionReport } from "./collect";
import { mergeArticle } from "./merge";
import type { SourceArticleRef, SourceProvider } from "./sources/source-provider";

/**
 * Real-time detection (CLAUDE.md §4.4, freshness SLO < 2 min). Each pass reads the
 * first page of every language (one request each) and fetches only articles that
 * are new or whose source modification time changed since they were last seen.
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

export async function pollOnce(
  provider: SourceProvider,
  repository: ArticleRepository,
  langs: readonly Lang[],
  seen: SeenIndex,
  now: () => Date = () => new Date(),
): Promise<PollResult> {
  const result: PollResult = {
    outcomes: { created: 0, updated: 0, unchanged: 0 },
    failures: [],
    detectionDelays: [],
  };
  for (const lang of langs) {
    const { refs } = await provider.listPage(lang, 1);
    for (const ref of refs.filter((candidate) => !seen.isUnchanged(candidate))) {
      try {
        const existing = await repository.get(provider.articleIdFor(ref));
        const outcome = await repository.save(
          mergeArticle(existing, await provider.fetchArticle(ref)),
        );
        result.outcomes[outcome] += 1;
        if (outcome !== "unchanged") {
          const changedAt = Date.parse(ref.sourceUpdatedAt);
          if (!Number.isNaN(changedAt)) {
            result.detectionDelays.push(Math.max(0, (now().getTime() - changedAt) / 1000));
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
  }
  return result;
}

const SECOND = 1000;

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
