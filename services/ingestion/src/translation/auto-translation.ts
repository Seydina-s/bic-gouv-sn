import type { BatchClient, CollectReport } from "./batch-translation";

/*
 * Translation without anyone asking (owner's request of 22/10/2026): as soon as an
 * article's French version is in the app, the watcher sends it to be translated into
 * Wolof and English, then saves the replies at a later pass. Batches at half price;
 * a few new articles a day. The same runs, ledgers and checks as the "translate"
 * command, which stays for estimates, trials and catch-ups.
 */

/** The model of the owner's decision of 16/10/2026, for Wolof and English. */
export const DEFAULT_TRANSLATION_MODEL = "claude-sonnet-5-5";
/** Articles at most sent at one pass and in one language: a bound on a pass's cost. */
export const SENT_PER_PASS = 50;

/** One kind of content in one language: its translation runs (BatchTranslation). */
export interface TranslationRuns {
  collect(client: BatchClient): Promise<CollectReport>;
  submit(
    client: BatchClient,
    model: string,
    options: { since: string | null; limit: number },
  ): Promise<{ sent: number; batchId: string | null }>;
}

export interface PassReport {
  name: string;
  saved: number;
  refused: number;
  sent: number;
  /** Why this one failed (the service down, a refused call); the others go on. */
  failure: string | null;
}

/**
 * One pass: for each kind and language, the ended runs are saved first, then what is
 * still waiting is sent. A failure in one leaves the others untouched.
 */
export async function translationPass(
  runs: readonly { name: string; runs: TranslationRuns }[],
  client: BatchClient,
  options: { model: string; since: string | null; limit?: number },
): Promise<PassReport[]> {
  const reports: PassReport[] = [];
  for (const { name, runs: translation } of runs) {
    try {
      const collected = await translation.collect(client);
      const { sent } = await translation.submit(client, options.model, {
        since: options.since,
        limit: options.limit ?? SENT_PER_PASS,
      });
      const refused = Object.values(collected.refused).reduce((sum, n) => sum + n, 0);
      reports.push({ name, saved: collected.saved, refused, sent, failure: null });
    } catch (error) {
      reports.push({
        name,
        saved: 0,
        refused: 0,
        sent: 0,
        failure: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return reports;
}
