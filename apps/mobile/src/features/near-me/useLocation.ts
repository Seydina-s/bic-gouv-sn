import type { GeoPoint } from "@bgs/shared-types";
import * as Location from "expo-location";
import { useCallback, useState } from "react";

export type LocationStatus = "idle" | "locating" | "found" | "denied" | "unavailable";

/** A position this old (minutes) is still good enough to rank nearby services. */
const RECENT_MS = 5 * 60 * 1000;

async function currentPoint(): Promise<GeoPoint | null> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_MS });
  const position =
    recent ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/**
 * The phone's position, asked only when the person taps "Utiliser ma position"
 * (never at launch). It stays in memory on the phone: never stored, never sent.
 */
export function useLocation() {
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [point, setPoint] = useState<GeoPoint | null>(null);

  const locate = useCallback(async () => {
    setStatus("locating");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return;
      }
      const found = await currentPoint();
      setPoint(found);
      setStatus(found === null ? "unavailable" : "found");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  /** Back to no position at all: the person chooses again. */
  const forget = useCallback(() => {
    setStatus("idle");
    setPoint(null);
  }, []);

  return { status, point, locate, forget };
}
