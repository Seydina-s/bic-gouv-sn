import { type JsonDocument, TypedDocument } from "@bgs/content-store";
import { z } from "zod";
import type { BatchRequest, BatchResult, BatchStatus } from "./claude-batches";
import { estimateCost, type CostEstimate, type OutputSize } from "./cost-estimate";
import { joinParts, partId } from "./parts";
import type { TranslationRefusal } from "./translation-check";

/*
 * Machine translation in batches, whatever is translated (articles, procedure
 * sheets): sent at once, collected later (within a day), each reply checked, then
 * saved as a machine translation, labelled as such in the app. What is translated,
 * how a reply is checked and where it is saved come from its kind.
 */

const runSchema = z.object({
  batchId: z.string().min(1),
  model: z.string().min(1),
  submittedAt: z.string(),
  /** Each item sent (article or sheet), and the version it was sent at. */
  articles: z.array(z.object({ id: z.string(), contentHash: z.string() })),
  collectedAt: z.string().nullable(),
});
const stateSchema = z.object({ runs: z.array(runSchema) });
type Run = z.infer<typeof runSchema>;

/**
 * Translations saved together: one write of a file store for each group (17/10/2026:
 * saved one by one, 1 066 articles rewrote a 56 MB file 2 132 times and the API,
 * rebuilding its base at each change, slowed to 48 s a question).
 */
const SAVED_TOGETHER = 200;

/**
 * Sendings of one version of an item that came back without a translation saved, after
 * which it is no longer sent (22/10/2026: 17 articles refused by the checks at every
 * try would have been paid for again every half hour once translation ran by itself).
 * A new version at the source tries again.
 */
export const MAX_TRIES = 2;

/** The provider keeps a batch's replies 29 days. */
const REPLIES_KEPT_MS = 29 * 24 * 60 * 60_000;

export type Checked<Value> =
  { ok: true; value: Value } | { ok: false; refusal: TranslationRefusal };

/** What a kind of content gives its translation runs. */
export interface TranslatedKind<Item, French, Value> {
  all(): Promise<Item[]>;
  get(id: string): Promise<Item | null>;
  id(item: Item): string;
  /** The item's version when it is sent: a reply for an older one is never saved. */
  version(item: Item): string;
  /** Whether a reply sent at `sentVersion` still fits the item; `version` equal by default. */
  stillFits?(item: Item, sentVersion: string): boolean;
  /** What to translate, null when the item needs no translation into this language. */
  french(item: Item): French | null;
  /** The items waiting, in the order they are sent; `since` when it applies. */
  waiting(all: readonly Item[], since: string | null): Item[];
  /** Rules fixed for every item of a run (cached by the provider). */
  system(all: readonly Item[]): string;
  /** The item as data, and room for its translation. */
  request(french: French): { user: string; maxOutputTokens: number };
  /** An item too long for one reply, in parts (one request each); `request` by default. */
  requests?(french: French): { user: string; maxOutputTokens: number }[];
  /** The texts of an item's parts joined into one reply; null when they cannot be. */
  mergeParts?(texts: readonly string[]): string | null;
  check(french: French, reply: string): Checked<Value>;
  /** Saves the translations of a group of items at once. */
  saveAll(translated: readonly { item: Item; value: Value }[]): Promise<void>;
  /** Size of the translation against the French, for the cost estimate. */
  output: OutputSize;
}

/** What a collection did with each reply. */
export interface CollectReport {
  saved: number;
  refused: Partial<Record<TranslationRefusal, number>>;
  failed: number;
  /** The item changed, or no longer needs translating, since it was sent. */
  outdated: number;
  inputTokens: number;
  outputTokens: number;
  stillRunning: number;
}

export interface BatchClient {
  create(requests: readonly BatchRequest[]): Promise<string>;
  status(id: string): Promise<{ status: BatchStatus; resultsUrl: string | null }>;
  results(resultsUrl: string): Promise<BatchResult[]>;
}

/** One reply of a trial run, for a person to read: nothing is saved. */
export interface TrialReply<French, Value> {
  id: string;
  /** The French that was sent. */
  french: French;
  translation: Value | null;
  /** Why the checks refused it, or why the service failed. */
  problem: string | null;
  inputTokens: number;
  outputTokens: number;
}

export interface BatchTranslationOptions {
  /** Where the runs are remembered between the sending and the collection. */
  state: JsonDocument;
  now?: () => Date;
}

export class BatchTranslation<Item, French, Value> {
  private readonly state: TypedDocument<z.infer<typeof stateSchema>>;
  private readonly now: () => Date;

  constructor(
    private readonly kind: TranslatedKind<Item, French, Value>,
    options: BatchTranslationOptions,
  ) {
    this.state = new TypedDocument(options.state, stateSchema, { runs: [] });
    this.now = options.now ?? (() => new Date());
  }

  /** The items still waiting for the language, not already in a run being processed. */
  async pending(since: string | null): Promise<{ all: Item[]; toSend: Item[] }> {
    const all = await this.kind.all();
    const { runs } = await this.state.read();
    const sent = new Set(
      runs
        .filter((run) => run.collectedAt === null)
        .flatMap((run) => run.articles.map((item) => item.id)),
    );
    // Versions already sent and collected, each time without a translation saved.
    const tries = new Map<string, string[]>();
    for (const run of runs.filter((r) => r.collectedAt !== null)) {
      for (const { id, contentHash } of run.articles) {
        tries.set(id, [...(tries.get(id) ?? []), contentHash]);
      }
    }
    const triedOut = (item: Item) =>
      (tries.get(this.kind.id(item)) ?? []).filter((version) => this.fits(item, version)).length >=
      MAX_TRIES;
    const waiting = this.kind.waiting(all, since);
    return {
      all,
      toSend: waiting.filter((item) => !sent.has(this.kind.id(item)) && !triedOut(item)),
    };
  }

  /** Whether a reply sent at `version` would still fit the item as it is now. */
  private fits(item: Item, version: string): boolean {
    return this.kind.stillFits?.(item, version) ?? this.kind.version(item) === version;
  }

  /** What sending up to `limit` waiting items would cost, before anything is sent. */
  async estimate(
    options: { since: string | null; limit: number },
    models: readonly string[],
  ): Promise<CostEstimate> {
    const { all, toSend } = await this.pending(options.since);
    const sizes = toSend.slice(0, options.limit).flatMap((item) => {
      const french = this.kind.french(item);
      return french === null ? [] : [this.kind.request(french).user.length];
    });
    return estimateCost(sizes, this.kind.system(all), this.kind.output, models);
  }

  /** Sends up to `limit` items in one batch; returns how many were sent. */
  async submit(
    client: BatchClient,
    model: string,
    options: { since: string | null; limit: number },
  ) {
    const { all, toSend } = await this.pending(options.since);
    const chosen = toSend.slice(0, options.limit);
    if (chosen.length === 0) {
      return { sent: 0, batchId: null };
    }
    const requests = this.requestsFor(chosen, all);
    const batchId = await client.create(requests);
    await this.state.change((current) => ({
      next: {
        runs: [
          ...current.runs,
          {
            batchId,
            model,
            submittedAt: this.now().toISOString(),
            articles: chosen.map((item) => ({
              id: this.kind.id(item),
              contentHash: this.kind.version(item),
            })),
            collectedAt: null,
          },
        ],
      },
      result: undefined,
    }));
    return { sent: requests.length, batchId };
  }

  /**
   * A trial (16/10/2026): the chosen items sent in one batch that is remembered
   * nowhere, so that a later full run still takes them. Returns the batch id.
   */
  async submitTrial(client: BatchClient, chosen: readonly Item[]): Promise<string> {
    return client.create(this.requestsFor(chosen, await this.kind.all()));
  }

  /** A trial's replies once its batch ended (null before), each checked, none saved. */
  async trialReplies(
    client: BatchClient,
    batchId: string,
  ): Promise<TrialReply<French, Value>[] | null> {
    const { status, resultsUrl } = await client.status(batchId);
    if (status !== "ended" || resultsUrl === null) {
      return null;
    }
    const replies: TrialReply<French, Value>[] = [];
    for (const result of await this.resultsOf(client, resultsUrl)) {
      const item = await this.kind.get(result.customId);
      const french = item === null ? null : this.kind.french(item);
      if (french === null) {
        continue;
      }
      if (!result.ok) {
        replies.push({
          id: result.customId,
          french,
          translation: null,
          problem: "failed",
          inputTokens: 0,
          outputTokens: 0,
        });
        continue;
      }
      const checked: Checked<Value> = result.truncated
        ? { ok: false, refusal: "truncated" }
        : this.kind.check(french, result.text);
      replies.push({
        id: result.customId,
        french,
        translation: checked.ok ? checked.value : null,
        problem: checked.ok ? null : checked.refusal,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });
    }
    return replies;
  }

  /** One request per item, or per part of a long one: the fixed rules, then the item. */
  private requestsFor(chosen: readonly Item[], all: readonly Item[]): BatchRequest[] {
    const system = this.kind.system(all);
    return chosen.flatMap((item): BatchRequest[] => {
      const french = this.kind.french(item);
      if (french === null) {
        return [];
      }
      const parts = this.kind.requests?.(french) ?? [this.kind.request(french)];
      return parts.map((part, index) => ({
        customId: partId(this.kind.id(item), index, parts.length),
        system,
        ...part,
      }));
    });
  }

  /** A batch's results, the parts of a long item joined back into one. */
  private async resultsOf(client: BatchClient, resultsUrl: string): Promise<BatchResult[]> {
    return joinParts(await client.results(resultsUrl), (texts) =>
      this.kind.mergeParts === undefined ? null : this.kind.mergeParts(texts),
    );
  }

  /** Saves what the ended runs translated; runs still being processed are left for later. */
  async collect(client: BatchClient): Promise<CollectReport> {
    const report: CollectReport = {
      saved: 0,
      refused: {},
      failed: 0,
      outdated: 0,
      inputTokens: 0,
      outputTokens: 0,
      stillRunning: 0,
    };
    const open = (await this.state.read()).runs.filter((run) => run.collectedAt === null);
    for (const run of open) {
      const { status, resultsUrl } = await client.status(run.batchId);
      if (status !== "ended" || resultsUrl === null) {
        report.stillRunning += 1;
        continue;
      }
      let group: { item: Item; value: Value }[] = [];
      for (const result of await this.resultsOf(client, resultsUrl)) {
        const checked = await this.apply(run, result, report);
        if (checked !== null) {
          group.push(checked);
        }
        if (group.length >= SAVED_TOGETHER) {
          await this.saveGroup(group, report);
          group = [];
        }
      }
      await this.saveGroup(group, report);
      await this.markCollected(run.batchId);
    }
    return report;
  }

  /** The latest run's raw replies, to understand a refusal; nothing is saved. */
  async latestReplies(client: BatchClient): Promise<BatchResult[]> {
    const latest = (await this.state.read()).runs.at(-1);
    if (latest === undefined) {
      return [];
    }
    const { resultsUrl } = await client.status(latest.batchId);
    return resultsUrl === null ? [] : client.results(resultsUrl);
  }

  /**
   * Collects again every run whose replies the provider still keeps (29 days), after
   * a fix: nothing is paid twice, and items saved since are left alone (17/10/2026:
   * 2 562 Wolof replies were set aside by mistake, from three runs).
   */
  async recollectRecent(client: BatchClient): Promise<CollectReport> {
    const since = this.now().getTime() - REPLIES_KEPT_MS;
    await this.state.change((current) => ({
      next: {
        runs: current.runs.map((run) =>
          Date.parse(run.submittedAt) >= since ? { ...run, collectedAt: null } : run,
        ),
      },
      result: undefined,
    }));
    return this.collect(client);
  }

  private async saveGroup(
    group: readonly { item: Item; value: Value }[],
    report: CollectReport,
  ): Promise<void> {
    if (group.length > 0) {
      await this.kind.saveAll(group);
      report.saved += group.length;
    }
  }

  /** A reply checked and still for the current version, ready to save; null otherwise. */
  private async apply(
    run: Run,
    result: BatchResult,
    report: CollectReport,
  ): Promise<{ item: Item; value: Value } | null> {
    if (!result.ok) {
      report.failed += 1;
      return null;
    }
    report.inputTokens += result.inputTokens;
    report.outputTokens += result.outputTokens;
    if (result.truncated) {
      report.refused.truncated = (report.refused.truncated ?? 0) + 1;
      return null;
    }
    const sent = run.articles.find((item) => item.id === result.customId);
    const item = await this.kind.get(result.customId);
    const french = item === null ? null : this.kind.french(item);
    if (
      sent === undefined ||
      item === null ||
      french === null ||
      !this.fits(item, sent.contentHash)
    ) {
      report.outdated += 1;
      return null;
    }
    const checked = this.kind.check(french, result.text);
    if (!checked.ok) {
      report.refused[checked.refusal] = (report.refused[checked.refusal] ?? 0) + 1;
      return null;
    }
    return { item, value: checked.value };
  }

  private markCollected(batchId: string): Promise<void> {
    const at = this.now().toISOString();
    return this.state.change((current) => ({
      next: {
        runs: current.runs.map((run) =>
          run.batchId === batchId ? { ...run, collectedAt: at } : run,
        ),
      },
      result: undefined,
    }));
  }
}
