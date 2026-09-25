import type { ArticleRepository, SaveOutcome } from "@bgs/content-store";
import type { Lang } from "@bgs/shared-types";
import { collectLatest, type CollectionReport } from "./collect";
import { mergeArticle } from "./merge";
import type { SourceProvider } from "./sources/source-provider";

export interface IngestionReport {
  outcomes: Record<SaveOutcome, number>;
  failures: CollectionReport["failures"];
}

/**
 * Collects the latest articles of one language and stores them: new articles are
 * created, edited ones versioned, identical ones left untouched (idempotent).
 */
export async function ingestLatest(
  provider: SourceProvider,
  repository: ArticleRepository,
  lang: Lang,
  limit: number,
): Promise<IngestionReport> {
  const collected = await collectLatest(provider, lang, limit);
  const outcomes: Record<SaveOutcome, number> = { created: 0, updated: 0, unchanged: 0 };
  for (const article of collected.articles) {
    const merged = mergeArticle(await repository.get(article.id), article);
    outcomes[await repository.save(merged)] += 1;
  }
  return { outcomes, failures: collected.failures };
}
