import { readNewsDetail, type NewsDetail, type NewsSummary } from "@bgs/shared-types";

/** What a favorite keeps: the whole article, so it stays readable offline. */
export interface Favorite {
  detail: NewsDetail;
  savedAt: string;
}

/** Name of the phone storage slot holding the favorites (not a secret). */
export const FAVORITES_SLOT = "bgs-favorites-v1";

/** Minimal key-value storage (AsyncStorage in the app, a map in tests). */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/**
 * Reads the saved favorites, newest first. Each article goes through the tolerant
 * reader: one saved by an older app version is kept if still readable, skipped if
 * not; a damaged record never breaks the list.
 */
export async function loadFavorites(storage: KeyValueStorage): Promise<Favorite[]> {
  let raw: unknown;
  try {
    raw = JSON.parse((await storage.getItem(FAVORITES_SLOT)) ?? "[]");
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.flatMap((entry: unknown) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }
    const { detail, savedAt } = entry as { detail?: unknown; savedAt?: unknown };
    const article = readNewsDetail(detail);
    return article === null || typeof savedAt !== "string" ? [] : [{ detail: article, savedAt }];
  });
}

export async function saveFavorites(storage: KeyValueStorage, favorites: Favorite[]) {
  await storage.setItem(FAVORITES_SLOT, JSON.stringify(favorites));
}

/** Adds the article on top, or removes it when it is already a favorite. */
export function toggleFavorite(
  favorites: readonly Favorite[],
  detail: NewsDetail,
  now: Date,
): Favorite[] {
  return favorites.some((favorite) => favorite.detail.id === detail.id)
    ? favorites.filter((favorite) => favorite.detail.id !== detail.id)
    : [{ detail, savedAt: now.toISOString() }, ...favorites];
}

/** A kept article shown as a story of the list. */
export function summaryOf(detail: NewsDetail): NewsSummary {
  return {
    id: detail.id,
    category: detail.category,
    publishedOn: detail.publishedOn,
    lang: detail.lang,
    title: detail.title,
    excerpt: "",
    translationStatus: detail.translationStatus,
    availableLangs: detail.availableLangs,
    cover: detail.cover,
  };
}
