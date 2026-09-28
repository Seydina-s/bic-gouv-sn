import { z } from "zod";
import { isoDateSchema, langSchema } from "../common/primitives.schema";

/*
 * Searches that found nothing, for the console (CLAUDE.md §1: "recherches sans
 * résultat"). User decision of 28/09/2026: only searches made at least 3 times are
 * shown, and nothing about the people who searched is kept (no network address, no
 * device, no time of day: only the day it was last searched).
 */

/** Fewer occurrences may be one person's own words (a name): never shown. */
export const SEARCH_MISS_MIN_COUNT = 3;
/** Longest query kept, like the search routes accept. */
export const SEARCH_QUERY_MAX_LENGTH = 120;

export const searchAreaSchema = z.enum(["news", "procedures"]);
export type SearchArea = z.infer<typeof searchAreaSchema>;

export const searchMissSchema = z.object({
  area: searchAreaSchema,
  lang: langSchema,
  /** Normalized: lower case, single spaces. */
  query: z.string().min(1).max(SEARCH_QUERY_MAX_LENGTH),
  count: z.int().positive(),
  /** Day only, never the time. */
  lastOn: isoDateSchema,
});
export type SearchMiss = z.infer<typeof searchMissSchema>;

export const searchMissesFileSchema = z.object({
  schemaVersion: z.literal(1),
  entries: z.array(searchMissSchema),
});

export const searchMissesResponseSchema = z.object({
  minCount: z.int().positive(),
  entries: z.array(searchMissSchema),
});

/** One way of writing a search, so "Carte  d'Identité" and "carte d'identité" add up. */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ")
    .slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/** What the console may show: frequent enough, most searched first. */
export function shownSearchMisses(entries: readonly SearchMiss[]): SearchMiss[] {
  return entries
    .filter((entry) => entry.count >= SEARCH_MISS_MIN_COUNT)
    .sort((a, b) => b.count - a.count || b.lastOn.localeCompare(a.lastOn));
}
