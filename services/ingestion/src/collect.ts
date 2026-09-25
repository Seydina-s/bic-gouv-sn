import { errorCodeOf, type Lang, type NewsArticle } from "@bgs/shared-types";
import type { SourceProvider } from "./sources/source-provider";

export interface CollectionReport {
  articles: NewsArticle[];
  /** Items that failed, with their catalog code, reported instead of silently dropped. */
  failures: { ref: string; code: string; message: string }[];
}

/**
 * Collects the latest articles of one language. One failing article never stops the
 * others: it is reported with its error code (quarantine or unreachable).
 */
export async function collectLatest(
  provider: SourceProvider,
  lang: Lang,
  limit: number,
): Promise<CollectionReport> {
  const refs = (await provider.listLatest(lang, 1)).slice(0, limit);
  const report: CollectionReport = { articles: [], failures: [] };
  for (const ref of refs) {
    try {
      report.articles.push(await provider.fetchArticle(ref));
    } catch (error) {
      report.failures.push({
        ref: ref.slug,
        code: errorCodeOf(error) ?? "UNKNOWN",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return report;
}
