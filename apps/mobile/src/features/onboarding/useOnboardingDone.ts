import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

/** Phone storage slot remembering that the welcome screens were seen (not a secret). */
export const ONBOARDING_SLOT = "bgs-onboarding";

/**
 * Whether the welcome screens were already seen: null while reading the phone
 * storage (the splash screen stays up), then true or false. A read failure
 * counts as seen: the app must never get stuck on the welcome screens.
 */
export function useOnboardingDone(): { done: boolean | null; finish: () => void } {
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

  return { done, finish };
}
