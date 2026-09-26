import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

interface Flag {
  read: () => Promise<boolean>;
  event: "reduceMotionChanged" | "screenReaderChanged";
}

/** A system accessibility setting, followed live; null until known. */
function useSystemFlag({ read, event }: Flag): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let mounted = true;
    void read().then((value) => {
      if (mounted) {
        setEnabled(value);
      }
    });
    const subscription = AccessibilityInfo.addEventListener(event, setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [read, event]);
  return enabled;
}

const REDUCE_MOTION: Flag = {
  read: () => AccessibilityInfo.isReduceMotionEnabled(),
  event: "reduceMotionChanged",
};
const SCREEN_READER: Flag = {
  read: () => AccessibilityInfo.isScreenReaderEnabled(),
  event: "screenReaderChanged",
};

/** "Reduce motion" is on: movement becomes a cut or a crossfade. */
export function useReduceMotion(): boolean | null {
  return useSystemFlag(REDUCE_MOTION);
}

/** TalkBack or VoiceOver is on: nothing may change by itself under the reader. */
export function useScreenReader(): boolean | null {
  return useSystemFlag(SCREEN_READER);
}
