import { DETAIL } from "../../testing/news-fixtures";
import {
  FAVORITES_SLOT,
  loadFavorites,
  saveFavorites,
  summaryOf,
  toggleFavorite,
  type KeyValueStorage,
} from "./favorites-store";

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => Promise.resolve(data.get(key) ?? null),
    setItem: (key, value) => {
      data.set(key, value);
      return Promise.resolve();
    },
  };
}

const NOW = new Date("2026-09-26T08:00:00Z");

describe("favorites", () => {
  it("adds on top, then removes, the same article", () => {
    const added = toggleFavorite([], DETAIL, NOW);
    expect(added).toEqual([{ detail: DETAIL, savedAt: "2026-09-26T08:00:00.000Z" }]);
    expect(toggleFavorite(added, DETAIL, NOW)).toEqual([]);
  });

  it("keeps the whole article on the phone, round trip", async () => {
    const storage = memoryStorage();
    await saveFavorites(storage, toggleFavorite([], DETAIL, NOW));
    expect(await loadFavorites(storage)).toEqual([
      { detail: DETAIL, savedAt: "2026-09-26T08:00:00.000Z" },
    ]);
  });

  it("survives damaged or outdated records", async () => {
    expect(await loadFavorites(memoryStorage({ [FAVORITES_SLOT]: "{not json" }))).toEqual([]);
    expect(await loadFavorites(memoryStorage({ [FAVORITES_SLOT]: '{"a":1}' }))).toEqual([]);
    const mixed = JSON.stringify([
      null,
      { detail: { id: "broken" }, savedAt: "2026-09-26T08:00:00Z" },
      { detail: DETAIL, savedAt: 42 },
      { detail: DETAIL, savedAt: "2026-09-26T08:00:00Z" },
    ]);
    const loaded = await loadFavorites(memoryStorage({ [FAVORITES_SLOT]: mixed }));
    expect(loaded.map((favorite) => favorite.detail.id)).toEqual([DETAIL.id]);
  });

  it("shows a kept article as a story of the list", () => {
    expect(summaryOf(DETAIL)).toMatchObject({ id: DETAIL.id, title: DETAIL.title, excerpt: "" });
  });
});
