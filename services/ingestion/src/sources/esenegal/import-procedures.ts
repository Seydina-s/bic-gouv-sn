import type { ProcedureRepository, SaveOutcome } from "@bgs/content-store";
import { errorCodeOf } from "@bgs/shared-types";
import type { ProcedureSource } from "./esenegal-provider";

export interface ProcedureImportProgress {
  page: number;
  pageCount: number;
  outcomes: Record<SaveOutcome, number>;
  failures: { ref: string; code: string; message: string }[];
}

/**
 * Imports every procedure of e-senegal.sn, page after page. Idempotent: a procedure
 * unchanged at the source is left as is, a changed one gets a new version, a
 * failing one is reported and never blocks the others.
 */
export async function importProcedures(
  source: ProcedureSource,
  repository: ProcedureRepository,
  { maxPages, onPage }: { maxPages?: number; onPage?: (p: ProcedureImportProgress) => void } = {},
): Promise<ProcedureImportProgress> {
  const progress: ProcedureImportProgress = {
    page: 0,
    pageCount: 1,
    outcomes: { created: 0, updated: 0, unchanged: 0 },
    failures: [],
  };
  while (progress.page < Math.min(progress.pageCount, maxPages ?? Number.POSITIVE_INFINITY)) {
    const { slugs, pageCount } = await source.listPage(progress.page + 1);
    progress.page += 1;
    progress.pageCount = pageCount;
    for (const slug of slugs) {
      try {
        progress.outcomes[await repository.save(await source.fetchProcedure(slug))] += 1;
      } catch (error) {
        progress.failures.push({
          ref: slug,
          code: errorCodeOf(error) ?? "UNKNOWN",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    onPage?.(progress);
  }
  return progress;
}
