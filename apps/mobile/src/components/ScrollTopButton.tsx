import { ArrowUpIcon as ArrowUp } from "phosphor-react-native/src/icons/ArrowUp";
import { useCallback, useEffect, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";
import { useTranslation } from "../i18n/useTranslation";
import { useReduceMotion } from "../theme/useSystemAccessibility";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";
import { ProgressRing } from "./ProgressRing";

/** The button appears after this share of a screen has been scrolled. */
const SHOW_AFTER = 0.8;

/** How far down the page the reader is, from 0 (top) to 1 (the very end). */
export function scrolledShare({
  contentOffset,
  contentSize,
  layoutMeasurement,
}: NativeScrollEvent): number {
  const room = contentSize.height - layoutMeasurement.height;
  return room <= 0 ? 0 : Math.min(1, Math.max(0, contentOffset.y / room));
}

/**
 * Tells when the reader has scrolled far enough for "back to top" to help, and how
 * far down the page they are. Give `onScroll` to the list (with scrollEventThrottle),
 * `visible` and `progress` to the button.
 */
export function useScrollTop() {
  const { height } = useWindowDimensions();
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const progress = useSharedValue(0);
  const glide = theme.motion.duration.fast;
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Same value: React skips the render, so scrolling stays cheap.
      setVisible(event.nativeEvent.contentOffset.y > height * SHOW_AFTER);
      // Scroll events come every 100 ms: the ring glides between them.
      progress.set(withTiming(scrolledShare(event.nativeEvent), { duration: glide }));
    },
    [height, progress, glide],
  );
  return { visible, onScroll, progress };
}

/**
 * Room to leave under the end of a list, above the button's own distance from the
 * bottom edge, so the button never covers the last controls (the page numbers).
 */
export function useScrollTopClearance(): number {
  const { theme } = useTheme();
  return theme.touchTarget.min + theme.space.md;
}

export interface ScrollTopButtonProps {
  visible: boolean;
  /** How far down the page the reader is: the ring around the button fills with it. */
  progress: SharedValue<number>;
  /** Distance kept from the bottom edge (tab bar, system bar). */
  bottom: number;
  onPress: () => void;
}

/**
 * Small floating button, bottom right, shown once the reader has scrolled down:
 * brings the page back to the top. A ring around it fills as the reader goes down,
 * complete at the very end of the page (owner's request, 14/10/2026). Fades and rises in (a cut with "reduce motion"),
 * and is out of reach of touches and screen readers while hidden.
 */
export function ScrollTopButton({
  visible,
  progress: scrolled,
  bottom,
  onPress,
}: ScrollTopButtonProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const { color, space, radius, touchTarget, motion, borderWidth } = theme;

  useEffect(() => {
    const target = visible ? 1 : 0;
    if (reduceMotion !== false) {
      progress.setValue(target);
      return;
    }
    Animated.timing(progress, {
      toValue: target,
      duration: visible ? motion.duration.normal : motion.duration.exitNormal,
      useNativeDriver: true,
    }).start();
  }, [visible, reduceMotion, progress, motion.duration.normal, motion.duration.exitNormal]);

  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[
        styles.anchor,
        {
          right: space.lg,
          bottom,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [space.md, 0] }),
            },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("section.backToTop")}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          {
            width: touchTarget.min,
            height: touchTarget.min,
            borderRadius: radius.full,
            backgroundColor: color.surfaceRaised,
            borderColor: color.glassBorder,
            shadowColor: color.scrim,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        <ProgressRing
          progress={scrolled}
          size={touchTarget.min}
          thickness={borderWidth.progress}
          color={color.textBrand}
          trackColor={color.border}
        />
        <Icon icon={ArrowUp} color={color.textBrand} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute" },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    // Soft lift so the button reads above photos; kept subtle.
    elevation: 3,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
