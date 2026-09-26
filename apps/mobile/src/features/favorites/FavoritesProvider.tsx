import type { NewsDetail } from "@bgs/shared-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { loadFavorites, saveFavorites, toggleFavorite, type Favorite } from "./favorites-store";

interface FavoritesContextValue {
  favorites: Favorite[];
  /** The saved copy of an article, readable offline, or undefined. */
  saved(id: string): NewsDetail | undefined;
  toggle(detail: NewsDetail): void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

/** Favorites live on the phone only: no account, nothing sent anywhere. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  useEffect(() => {
    void loadFavorites(AsyncStorage).then(setFavorites);
  }, []);

  const value: FavoritesContextValue = {
    favorites,
    saved: (id) => favorites.find((favorite) => favorite.detail.id === id)?.detail,
    toggle: (detail) => {
      setFavorites((current) => {
        const next = toggleFavorite(current, detail, new Date());
        void saveFavorites(AsyncStorage, next);
        return next;
      });
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
