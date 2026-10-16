import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "bgs-last-opened-article";

/**
 * Remembers the last article opened, so the feed can mark "where you stopped"
 * (the folded tape flag of the direction contract). Kept only on the phone.
 */
export function useLastOpened() {
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  // An article opened before the saved one was read stays the last one.
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (active && !touched.current) {
        setLastOpened(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const markOpened = useCallback((id: string) => {
    touched.current = true;
    setLastOpened(id);
    void AsyncStorage.setItem(KEY, id);
  }, []);

  return { lastOpened, markOpened };
}
