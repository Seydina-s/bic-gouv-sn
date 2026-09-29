import {
  normalizeSearchQuery,
  shownSearchMisses,
  type Lang,
  type SearchArea,
  type SearchMiss,
} from "@bgs/shared-types";
import { PeriodicallySaved } from "./periodically-saved";
import {
  addMisses,
  MAX_QUERIES,
  missKey,
  mostSearched,
  type SearchMissStore,
} from "./search-miss-store";

/**
 * Searches that found nothing, counted per area, language and wording: nothing
 * about who searched (decision of 28/09/2026). Counted in memory, then added to
 * the store now and then: several API instances add up their counts (SCALE-02).
 * The console sees only those made at least SEARCH_MISS_MIN_COUNT times.
 */
export class SearchMisses extends PeriodicallySaved {
  /** Counted here since the last save. */
  private pending = new Map<string, SearchMiss>();

  constructor(private readonly store: SearchMissStore) {
    super();
  }

  record(area: SearchArea, lang: Lang, rawQuery: string, at = new Date()): void {
    const query = normalizeSearchQuery(rawQuery);
    if (query === "") {
      return;
    }
    addMisses(this.pending, [
      { area, lang, query, count: 1, lastOn: at.toISOString().slice(0, 10) },
    ]);
    if (this.pending.size > MAX_QUERIES) {
      this.pending = new Map(
        mostSearched(this.pending.values()).map((miss) => [
          missKey(miss.area, miss.lang, miss.query),
          miss,
        ]),
      );
    }
    this.changed();
  }

  /** Adds what was counted here to the store; kept for the next save if it fails. */
  protected async save(): Promise<void> {
    const counted = this.pending;
    this.pending = new Map();
    try {
      await this.store.add([...counted.values()]);
    } catch (error) {
      addMisses(this.pending, counted.values());
      throw error;
    }
  }

  /** Only what the console may show: frequent enough, most searched first. */
  async shown(): Promise<SearchMiss[]> {
    const all = new Map<string, SearchMiss>();
    addMisses(all, await this.store.all());
    addMisses(all, this.pending.values());
    return shownSearchMisses([...all.values()]);
  }
}
