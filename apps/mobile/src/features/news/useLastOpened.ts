import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

const KEY = "bgs-last-opened-article";

/**
 * Remembers the last article opened, so the feed can mark "where you stopped"
 * (the folded tape flag of the direction contract). Kept only on the phone.
 */
export function useLastOpened() {
  const [lastOpened, setLastOpened] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY).then((value) => {
      if (active) {
        setLastOpened(value);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const markOpened = useCallback((id: string) => {
    setLastOpened(id);
    void AsyncStorage.setItem(KEY, id);
  }, []);

  return { lastOpened, markOpened };
}
