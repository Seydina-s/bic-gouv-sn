import { readFile } from "node:fs/promises";
import {
  normalizeSearchQuery,
  searchMissesFileSchema,
  shownSearchMisses,
  type Lang,
  type SearchArea,
  type SearchMiss,
} from "@bgs/shared-types";
import { PeriodicallySaved } from "./periodically-saved";

/** Distinct searches kept: beyond, the least searched gives way (bounded on disk). */
const MAX_QUERIES = 2000;

/**
 * Searches that found nothing, counted per area, language and wording: nothing
 * about who searched (decision of 28/09/2026). The console sees only those made
 * at least SEARCH_MISS_MIN_COUNT times.
 */
export class SearchMisses extends PeriodicallySaved {
  private readonly misses = new Map<string, SearchMiss>();

  private constructor(path: string) {
    super(path);
  }

  /** The count saved at `path`, or an empty one (missing or unreadable file). */
  static async open(path: string): Promise<SearchMisses> {
    const log = new SearchMisses(path);
    try {
      const saved = searchMissesFileSchema.parse(JSON.parse(await readFile(path, "utf8")));
      for (const entry of saved.entries) {
        log.misses.set(SearchMisses.key(entry.area, entry.lang, entry.query), entry);
      }
    } catch {
      // Nothing saved yet, or damaged: the count starts again.
    }
    return log;
  }

  private static key(area: SearchArea, lang: Lang, query: string): string {
    return `${area}|${lang}|${query}`;
  }

  record(area: SearchArea, lang: Lang, rawQuery: string, at = new Date()): void {
    const query = normalizeSearchQuery(rawQuery);
    if (query === "") {
      return;
    }
    const key = SearchMisses.key(area, lang, query);
    const seen = this.misses.get(key);
    if (seen === undefined && this.misses.size >= MAX_QUERIES) {
      this.dropLeastSearched();
    }
    this.misses.set(key, {
      area,
      lang,
      query,
      count: (seen?.count ?? 0) + 1,
      lastOn: at.toISOString().slice(0, 10),
    });
    this.changed();
  }

  private dropLeastSearched(): void {
    let least: [string, SearchMiss] | undefined;
    for (const entry of this.misses) {
      if (least === undefined || entry[1].count < least[1].count) {
        least = entry;
      }
    }
    if (least !== undefined) {
      this.misses.delete(least[0]);
    }
  }

  /** Only what the console may show: frequent enough, most searched first. */
  shown(): SearchMiss[] {
    return shownSearchMisses([...this.misses.values()]);
  }

  protected snapshot() {
    return { schemaVersion: 1 as const, entries: [...this.misses.values()] };
  }
}
