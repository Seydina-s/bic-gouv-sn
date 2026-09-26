import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SettingsSheet } from "./SettingsSheet";

interface SettingsControl {
  openSettings: () => void;
}

const SettingsContext = createContext<SettingsControl | null>(null);

/**
 * One settings pop-up for the whole app, openable from any screen (top bar),
 * always laid over the screen the reader is on.
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const control = useMemo(
    () => ({
      openSettings: () => {
        setOpen(true);
      },
    }),
    [],
  );
  return (
    <SettingsContext.Provider value={control}>
      {children}
      <SettingsSheet
        visible={open}
        onClose={() => {
          setOpen(false);
        }}
      />
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsControl {
  const control = useContext(SettingsContext);
  if (control === null) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }
  return control;
}
