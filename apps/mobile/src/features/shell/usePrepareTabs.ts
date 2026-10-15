import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useDataSaver } from "../data-saver/DataSaverProvider";
import { stateServicesQuery } from "../near-me/useStateServices";

/** The front page shows and settles first; the other tabs are prepared after. */
export const PREPARE_TABS_AFTER_MS = 2500;

/**
 * Prepares the heaviest tabs in the background once the front page has settled, so
 * that a tap on them answers at once: "Démarches" is mounted; for "Près de moi" only
 * its list of services is loaded (not when saving data). Mounting the map itself in
 * the background (its native view, tiles and some 900 markers) froze the front page
 * on an iPhone until the system closed the app (owner's report, 15/10/2026).
 */
export function usePrepareTabs(active: boolean): void {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { saving } = useDataSaver();
  useEffect(() => {
    if (!active) {
      return undefined;
    }
    const timer = setTimeout(() => {
      router.prefetch("/procedures");
      if (!saving) {
        // A failure is nothing here: the tab loads its services when it opens.
        queryClient.query(stateServicesQuery).catch(() => undefined);
      }
    }, PREPARE_TABS_AFTER_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [active, saving, router, queryClient]);
}
