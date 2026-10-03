import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Icon } from "../../components/Icon";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { useListenFace, type Listening } from "./ListenButton";

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;

/** The scroll of a page with an "Écouter" pill, followed on the UI thread. */
export interface ListenScroll {
  /** Give to the page's Animated.ScrollView (with a short scrollEventThrottle). */
  onScroll: (event: ScrollEvent) => void;
  /** Where the pill ends in the page: past it, the pill is off screen. */
  setAnchor: (y: number) => void;
  /** 0 while the pill is on screen, 1 once it has left; follows the finger both ways. */
  past: Animated.AnimatedInterpolation<number> | Animated.Value;
  /** The pill has left the screen (for touches and screen readers). */
  away: boolean;
}

/**
 * Follows a page's scroll for its floating "Écouter": as the pill leaves the top
 * of the screen the floating button takes over, and as the reader scrolls back up
 * it hands back to the pill, in step with the finger. `onScrollJs` still receives
 * every scroll (the "back to top" button).
 */
export function useListenScroll(onScrollJs: (event: ScrollEvent) => void): ListenScroll {
  const { theme } = useTheme();
  const range = theme.touchTarget.min;
  const [scrollY] = useState(() => new Animated.Value(0));
  const [none] = useState(() => new Animated.Value(0));
  // Set once the page is laid out (again if its layout changes).
  const [anchor, setAnchor] = useState<number | null>(null);
  const [away, setAway] = useState(false);

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: (event: ScrollEvent) => {
          onScrollJs(event);
          // Same value: React skips the render, so scrolling stays cheap.
          setAway(anchor !== null && event.nativeEvent.contentOffset.y > anchor - range / 2);
        },
      }),
    [scrollY, onScrollJs, anchor, range],
  );

  const past = useMemo(
    () =>
      anchor === null
        ? none
        : scrollY.interpolate({
            inputRange: [anchor - range, anchor],
            outputRange: [0, 1],
            extrapolate: "clamp",
          }),
    [anchor, scrollY, none, range],
  );

  return { onScroll, setAnchor, past, away };
}

/**
 * While an article or a procedure is being read aloud and its "Écouter" pill has
 * scrolled away, a round button floats above "back to top" to pause or resume from
 * anywhere in the text (owner's request, 02/10/2026). It grows out as the pill
 * leaves and melts back as the reader returns to the top, following the scroll.
 */
export function FloatingListenButton({
  listening,
  scroll,
  bottom,
}: {
  listening: Listening;
  scroll: ListenScroll;
  /** Distance from the bottom edge: above the "back to top" button. */
  bottom: number;
}) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const face = useListenFace(listening);
  const [reading] = useState(() => new Animated.Value(0));
  const { color, space, radius, touchTarget, motion } = theme;
  const active = listening.offered && listening.status !== "idle";
  const visible = active && scroll.away;
  const size = touchTarget.min + space.sm;

  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduceMotion !== false) {
      reading.setValue(target);
      return;
    }
    Animated.timing(reading, {
      toValue: target,
      duration: active ? motion.duration.normal : motion.duration.exitNormal,
      useNativeDriver: true,
    }).start();
  }, [active, reduceMotion, reading, motion.duration.normal, motion.duration.exitNormal]);

  const progress = useMemo(() => Animated.multiply(scroll.past, reading), [scroll.past, reading]);

  return (
    <Animated.View
      testID="floating-listen"
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[
        styles.anchor,
        {
          // Centred over "back to top", which is a little smaller.
          right: space.lg - (size - touchTarget.min) / 2,
          bottom,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [space.md, 0] }),
            },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={face.action}
        onPress={listening.toggle}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: radius.full,
            backgroundColor: pressed ? color.primaryPressed : color.primary,
            shadowColor: color.scrim,
          },
        ]}
      >
        <Icon icon={face.icon} weight="fill" color={color.onPrimary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: "absolute" },
  button: {
    alignItems: "center",
    justifyContent: "center",
    // Soft lift so the button reads above the text; kept subtle.
    elevation: 4,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
});
