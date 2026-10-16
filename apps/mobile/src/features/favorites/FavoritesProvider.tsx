import type { NewsDetail } from "@bgs/shared-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useEffect, useRef, useState, type ReactNode } from "react";
import { loadFavorites, saveFavorites, toggleFavorite, type Favorite } from "./favorites-store";

interface FavoritesContextValue {
  favorites: Favorite[];
  /** The saved copy of an article, readable offline, or undefined. */
  saved(id: string): NewsDetail | undefined;
  toggle(detail: NewsDetail): void;
  /** Drops an article the source withdrew: its saved copy must not be shown any more. */
  forget(id: string): void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

type Change = (favorites: Favorite[]) => Favorite[];

/** Favorites live on the phone only: no account, nothing sent anywhere. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  // Changes made before the saved list is read: applied to it once read. Saving them
  // at once used to replace the whole list with them (audit of 15/10/2026).
  const loaded = useRef(false);
  const early = useRef<Change[]>([]);

  useEffect(() => {
    void loadFavorites(AsyncStorage).then((stored) => {
      loaded.current = true;
      const changes = early.current;
      early.current = [];
      const next = changes.reduce((list, change) => change(list), stored);
      setFavorites(next);
      if (changes.length > 0) {
        void saveFavorites(AsyncStorage, next);
      }
    });
  }, []);

  const apply = (change: Change) => {
    if (!loaded.current) {
      early.current.push(change);
      setFavorites(change);
      return;
    }
    setFavorites((current) => {
      const next = change(current);
      if (next !== current) {
        void saveFavorites(AsyncStorage, next);
      }
      return next;
    });
  };

  const value: FavoritesContextValue = {
    favorites,
    saved: (id) => favorites.find((favorite) => favorite.detail.id === id)?.detail,
    toggle: (detail) => {
      apply((current) => toggleFavorite(current, detail, new Date()));
    },
    forget: (id) => {
      apply((current) =>
        current.some((favorite) => favorite.detail.id === id)
          ? current.filter((favorite) => favorite.detail.id !== id)
          : current,
      );
    },
  };
  return <FavoritesContext value={value}>{children}</FavoritesContext>;
}

export function useFavorites(): FavoritesContextValue {
  const context = use(FavoritesContext);
  if (context === null) {
    throw new Error("useFavorites must be used inside <FavoritesProvider>");
  }
  return context;
}
