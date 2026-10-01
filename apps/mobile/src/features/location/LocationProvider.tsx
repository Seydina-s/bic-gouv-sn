import type { GeoPoint } from "@bgs/shared-types";
import * as Location from "expo-location";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import { usePersistentChoice } from "../../data/usePersistentChoice";

export type LocationStatus = "idle" | "locating" | "found" | "denied" | "unavailable";

/** A position this old (minutes) is still good enough to rank nearby services. */
const RECENT_MS = 5 * 60 * 1000;
const INVITED_SLOT = "bgs-location-invited";
const INVITED: readonly ("no" | "yes")[] = ["no", "yes"];

export interface LocationState {
  /** False on the web preview: the phone's position is asked on a phone only. */
  supported: boolean;
  status: LocationStatus;
  point: GeoPoint | null;
  /** Asks the phone (once allowed, it no longer asks), then finds the position. */
  locate: () => Promise<void>;
  /** Back to no position at all: the person chooses again. */
  forget: () => void;
  /** The welcome invitation is due: never asked, and no position yet. */
  invitationDue: boolean;
  /** Settles once the phone's own question, if any, is answered. */
  answerInvitation: (accepted: boolean) => Promise<void>;
}

const LocationContext = createContext<LocationState | null>(null);

async function currentPoint(): Promise<GeoPoint> {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: RECENT_MS });
  const position =
    recent ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

/** On Android, the phone's location may be off altogether: the system offers to turn it on. */
async function switchOnIfOff(): Promise<void> {
  if (Platform.OS !== "android" || (await Location.hasServicesEnabledAsync())) {
    return;
  }
  await Location.enableNetworkProviderAsync().catch(() => undefined);
}

/**
 * The phone's position, shared by the front page (which invites the person to
 * allow it, decision of the user, 01/10/2026) and "Près de moi". Once allowed, it
 * is found at every opening, without a tap. It stays in memory on the phone:
 * never stored, never sent.
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  const supported = Platform.OS !== "web";
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [invited, markInvited] = usePersistentChoice(INVITED_SLOT, INVITED, "no");

  const find = useCallback(async () => {
    setStatus("locating");
    try {
      await switchOnIfOff();
      setPoint(await currentPoint());
      setStatus("found");
    } catch {
      setStatus("unavailable");
    }
  }, []);

  const locate = useCallback(async () => {
    setStatus("locating");
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus("denied");
        return;
      }
    } catch {
      setStatus("unavailable");
      return;
    }
    await find();
  }, [find]);

  // Already allowed (an earlier yes): the position is there when the app opens.
  useEffect(() => {
    if (!supported) {
      return undefined;
    }
    let active = true;
    Location.getForegroundPermissionsAsync()
      .then((permission) => {
        if (active && permission.granted) {
          void find();
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [supported, find]);

  const forget = useCallback(() => {
    setStatus("idle");
    setPoint(null);
  }, []);

  const answerInvitation = useCallback(
    (accepted: boolean) => {
      markInvited("yes");
      return accepted ? locate() : Promise.resolve();
    },
    [markInvited, locate],
  );

  const value = useMemo(
    () => ({
      supported,
      status,
      point,
      locate,
      forget,
      invitationDue: supported && invited === "no" && status === "idle",
      answerInvitation,
    }),
    [status, point, locate, forget, supported, invited, answerInvitation],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationState {
  const value = useContext(LocationContext);
  if (value === null) {
    throw new Error("useLocation must be used inside LocationProvider");
  }
  return value;
}
