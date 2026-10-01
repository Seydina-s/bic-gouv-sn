import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useDataSaver } from "../data-saver/DataSaverProvider";

/** The front page shows and settles first; the other tabs are prepared after. */
export const PREPARE_TABS_AFTER_MS = 2500;

/**
 * Prepares the heaviest tabs in the background once the front page has settled,
 * so that a tap on them answers at once: "Démarches", and "Près de moi" with its
 * map (not when saving data: the map would download its tiles).
 */
export function usePrepareTabs(active: boolean): void {
  const router = useRouter();
  const { saving } = useDataSaver();
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = setTimeout(() => {
      router.prefetch("/procedures");
      if (!saving) {
        router.prefetch("/near-me");
      }
    }, PREPARE_TABS_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [active, saving, router]);
}
