import { useEffect, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated } from "react-native";
import { useTheme } from "../../theme/useTheme";

const STAGGER_MS = 40;
const RISE = 12;

/**
 * Signature motion of the feed: bands are "woven in" one after another, rising
 * slightly as they fade in. Native driver (opacity + translate only); replaced by
 * an instant appearance when the system "reduce motion" setting is on.
 */
export function WovenIn({ index, children }: { index: number; children: ReactNode }) {
  const { theme } = useTheme();
  // Created once per band; kept in state so render never reads a ref.
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion === null) {
      return;
    }
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    const { damping, stiffness, mass } = theme.motion.spring.gentle;
    Animated.spring(progress, {
      toValue: 1,
      delay: index * STAGGER_MS,
      damping,
      stiffness,
      mass,
      useNativeDriver: true,
    }).start();
  }, [index, progress, reduceMotion, theme.motion.spring.gentle]);

  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [RISE, 0] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
