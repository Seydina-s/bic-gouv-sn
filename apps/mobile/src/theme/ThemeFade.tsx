import { useLayoutEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import type { Theme } from "@bgs/ui";
import { useReduceMotion } from "./useSystemAccessibility";
import { useTheme } from "./useTheme";

/** Colour of the veil when the theme changes from `before` to `after`; null: none. */
export function fadeFrom(before: Theme, after: Theme, reduceMotion: boolean | null): string | null {
  return before.scheme === after.scheme || reduceMotion === true ? null : before.color.background;
}

/**
 * Light and dark modes dissolve into each other (user's request, 02/10/2026): when
 * the scheme changes, a veil of the previous background covers the new one, then
 * fades away. It is laid before the screen is painted, so nothing snaps; it never
 * takes a touch, and it is skipped when the phone asks for less motion.
 */
export function ThemeFade() {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const previous = useRef(theme);
  const [veil, setVeil] = useState<string | null>(null);
  const opacity = useSharedValue(0);

  useLayoutEffect(() => {
    const from = fadeFrom(previous.current, theme, reduceMotion);
    previous.current = theme;
    if (from === null) {
      return;
    }
    setVeil(from);
    opacity.value = 1;
    opacity.value = withTiming(
      0,
      { duration: theme.motion.duration.themeFade, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished === true) {
          scheduleOnRN(setVeil, null);
        }
      },
    );
  }, [theme, reduceMotion, opacity]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  if (veil === null) {
    return null;
  }
  return (
    <Animated.View
      testID="theme-fade"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: veil }, fade]}
    />
  );
}
