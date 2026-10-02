import type { GeoPoint } from "@bgs/shared-types";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "../../theme/useTheme";
import { loadOfflineManager } from "./load-service-map";
import { areaAround, estimatedMegabytes, OFFLINE_ZOOMS, placeKey } from "./offline-area";
import { mapStyleUrl } from "./service-map";
import { API_BASE_URL } from "../../api/base-url";

export type OfflineAreaState =
  | { kind: "idle"; megabytes: number }
  | { kind: "saving"; percent: number }
  | { kind: "saved" }
  | { kind: "failed"; megabytes: number };

/**
 * Keeps the streets around a place on the phone (MAP-11), to find the services
 * without a network. One area at a time: keeping a new one replaces the last.
 */
export function useOfflineArea(place: GeoPoint | null) {
  const { theme } = useTheme();
  const key = place === null ? null : placeKey(place);
  const megabytes = place === null ? 0 : estimatedMegabytes(areaAround(place));
  // What happened for which place: another place starts idle again.
  const [progress, setProgress] = useState<{ key: string; state: OfflineAreaState } | null>(null);
  const state: OfflineAreaState =
    progress !== null && progress.key === key ? progress.state : { kind: "idle", megabytes };

  // An area already kept for this place shows as such.
  useEffect(() => {
    let active = true;
    if (key === null) {
      return;
    }
    loadOfflineManager()
      .then((manager) => manager.getPacks())
      .then((packs) => {
        if (active && packs.some((pack) => pack.metadata["place"] === key)) {
          setProgress({ key, state: { kind: "saved" } });
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);

  const keep = useCallback(async () => {
    if (place === null || key === null) {
      return;
    }
    const report = (next: OfflineAreaState) => {
      setProgress({ key, state: next });
    };
    report({ kind: "saving", percent: 0 });
    try {
      const manager = await loadOfflineManager();
      for (const pack of await manager.getPacks()) {
        await manager.deletePack(pack.id);
      }
      await manager.createPack(
        {
          mapStyle: mapStyleUrl(API_BASE_URL, theme.scheme),
          bounds: areaAround(place),
          minZoom: OFFLINE_ZOOMS.min,
          maxZoom: OFFLINE_ZOOMS.max,
          metadata: { place: key },
        },
        (_pack, status) => {
          report(
            status.state === "complete"
              ? { kind: "saved" }
              : { kind: "saving", percent: Math.round(status.percentage) },
          );
        },
        () => {
          report({ kind: "failed", megabytes });
        },
      );
    } catch {
      report({ kind: "failed", megabytes });
    }
  }, [place, key, megabytes, theme.scheme]);

  return { state, keep };
}
