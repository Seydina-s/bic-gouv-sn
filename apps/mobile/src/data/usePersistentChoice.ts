import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * A choice among fixed options, remembered on the phone (settings). Starts from
 * `initial`, then takes the saved value once read; an unknown or damaged saved
 * value is ignored, and so is a saved value read after the person already chose
 * (audit of 15/10/2026). Saving never blocks the screen and a failure keeps the
 * choice for the current session.
 */
export function usePersistentChoice<T extends string>(
  slot: string,
  options: readonly T[],
  initial: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(initial);
  // Chosen before the saved value was read: the saved (older) one must not replace it.
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(slot).then(
      (saved) => {
        const known = options.find((option) => option === saved);
        if (active && !touched.current && known !== undefined) {
          setValue(known);
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
    // The options of a slot never change during the app's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  const choose = useCallback(
    (next: T) => {
      touched.current = true;
      setValue(next);
      AsyncStorage.setItem(slot, next).catch(() => undefined);
    },
    [slot],
  );

  return [value, choose];
}
