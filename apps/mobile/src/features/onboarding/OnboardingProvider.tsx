import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Phone storage slot remembering that the welcome screens were seen (not a secret). */
export const ONBOARDING_SLOT = "bgs-onboarding";

export interface OnboardingState {
  /** Null while reading the phone storage (the splash stays up), then true or false. */
  done: boolean | null;
  finish: () => void;
  /** Shows the welcome screens again, from the start (Réglages › Redémarrer). */
  restart: () => void;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

/**
 * Whether the welcome screens were already seen. A read failure counts as seen:
 * the app must never get stuck on the welcome screens.
 */
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [done, setDone] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(ONBOARDING_SLOT).then(
      (saved) => {
        if (active) {
          setDone(saved === "done");
        }
      },
      () => {
        if (active) {
          setDone(true);
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const finish = useCallback(() => {
    setDone(true);
    AsyncStorage.setItem(ONBOARDING_SLOT, "done").catch(() => undefined);
  }, []);
  const restart = useCallback(() => {
    setDone(false);
    AsyncStorage.removeItem(ONBOARDING_SLOT).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ done, finish, restart }), [done, finish, restart]);
  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingDone(): OnboardingState {
  const value = useContext(OnboardingContext);
  if (value === null) {
    throw new Error("useOnboardingDone must be used inside OnboardingProvider");
  }
  return value;
}
