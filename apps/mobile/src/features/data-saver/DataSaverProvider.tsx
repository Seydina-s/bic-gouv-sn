import { NetworkStateType, useNetworkState } from "expo-network";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentChoice } from "../../data/usePersistentChoice";

/** Never, on a mobile network only, or always: when photos wait for a tap. */
export type DataSaverPreference = "never" | "cellular" | "always";

const PREFERENCES: readonly DataSaverPreference[] = ["never", "cellular", "always"];
/** Where the choice is kept on the phone (not a secret). */
const DATA_SAVER_SLOT = "bgs-data-saver";

export interface DataSaver {
  preference: DataSaverPreference;
  setPreference: (next: DataSaverPreference) => void;
  /** True when photos load only on request (MED-03). */
  saving: boolean;
}

/** Whether data is saved now, from the person's choice and the current network. */
export function savesData(
  preference: DataSaverPreference,
  network: NetworkStateType | undefined,
): boolean {
  if (preference === "cellular") {
    return network === NetworkStateType.CELLULAR;
  }
  return preference === "always";
}

const DataSaverContext = createContext<DataSaver | null>(null);

/**
 * Data saving for readers on a costly or slow connection (CLAUDE.md: 3G, entry-level
 * phones): photos then load only when asked for; their BlurHash colours stay.
 * Off by default; the network is followed live when the choice is "mobile only".
 */
export function DataSaverProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = usePersistentChoice(DATA_SAVER_SLOT, PREFERENCES, "never");
  const { type } = useNetworkState();
  const value = useMemo(
    () => ({ preference, setPreference, saving: savesData(preference, type) }),
    [preference, setPreference, type],
  );
  return <DataSaverContext.Provider value={value}>{children}</DataSaverContext.Provider>;
}

export function useDataSaver(): DataSaver {
  const value = useContext(DataSaverContext);
  if (value === null) {
    throw new Error("useDataSaver must be used inside DataSaverProvider");
  }
  return value;
}
