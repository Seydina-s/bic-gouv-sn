import { layout, radius } from "@bgs/ui";
import type { Tabs } from "expo-router";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "../i18n/useTranslation";
import { useReduceMotion } from "../theme/useSystemAccessibility";
import { useTheme } from "../theme/useTheme";
import { GlassBackdrop } from "./GlassBackdrop";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const {
  height: BAR_HEIGHT,
  sideMargin: SIDE_MARGIN,
  minBottomGap: MIN_BOTTOM_GAP,
  maxWidth: MAX_BAR_WIDTH,
} = layout.tabBar;

/** Side offsets of the bar: margins on phones, centred and capped on wide windows. */
function sideOffsets(windowWidth: number, left: number, right: number) {
  const free = windowWidth - left - right - 2 * SIDE_MARGIN;
  const extra = Math.max(0, free - MAX_BAR_WIDTH) / 2;
  return { left: left + SIDE_MARGIN + extra, right: right + SIDE_MARGIN + extra };
}
/** Width of the soft green indicator behind the active icon (Material 3 proportions). */
const INDICATOR_WIDTH = 56;
const INDICATOR_HEIGHT = 32;
/** The indicator stretches a little as it leaves, then settles on its new tab. */
const STRETCH = 1.3;

function bottomGap(insetBottom: number): number {
  return Math.max(insetBottom - 6, MIN_BOTTOM_GAP);
}

/** Space screens leave at the bottom so their last item is never hidden by the bar. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return BAR_HEIGHT + bottomGap(insets.bottom) + MIN_BOTTOM_GAP;
}

/**
 * One soft green indicator for the whole bar, sliding sideways from the tab left
 * to the tab chosen (user request, 30/09/2026, as in Facebook): the eye follows
 * the move. A cut when the phone asks for less motion.
 */
function useSlidingIndicator(index: number, slot: number) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const x = useSharedValue(0);
  const stretch = useSharedValue(1);
  const placed = useRef(false);
  useEffect(() => {
    if (slot === 0) {
      return;
    }
    const target = index * slot + (slot - INDICATOR_WIDTH) / 2;
    // Placed without moving the first time, and whenever motion is reduced.
    if (!placed.current || reduceMotion !== false) {
      placed.current = true;
      x.value = target;
      return;
    }
    const { snappy } = theme.motion.spring;
    x.value = withSpring(target, snappy);
    stretch.value = withSequence(
      withTiming(STRETCH, { duration: theme.motion.duration.fast }),
      withSpring(1, snappy),
    );
  }, [index, slot, reduceMotion, theme.motion, x, stretch]);
  return useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { scaleX: stretch.value }],
  }));
}

/**
 * Floating frosted-glass tab bar: content scrolls visibly beneath it, the active
 * section wears a soft green indicator and a filled icon, and every icon keeps its
 * label (CLAUDE.md: never an icon alone in the navigation).
 */
export function GlassTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { color, space, textStyle, opacity } = theme;
  // Where the indicator lies: each tab's width, and the icon's height in the bar.
  const [geometry, setGeometry] = useState({ slot: 0, top: 0 });
  const indicator = useSlidingIndicator(state.index, geometry.slot);

  return (
    <View
      style={[
        styles.shadow,
        {
          ...sideOffsets(width, insets.left, insets.right),
          bottom: bottomGap(insets.bottom),
          height: BAR_HEIGHT,
          shadowColor: color.scrim,
        },
      ]}
    >
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t("tabs.navigation")}
        style={[styles.glass, { borderColor: color.glassBorder }]}
        onLayout={(event) => {
          const slot = event.nativeEvent.layout.width / state.routes.length;
          setGeometry((current) => ({ ...current, slot }));
        }}
      >
        <GlassBackdrop />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sliding,
            {
              top: geometry.top,
              width: INDICATOR_WIDTH,
              height: INDICATOR_HEIGHT,
              borderRadius: INDICATOR_HEIGHT / 2,
              backgroundColor: color.primaryContainer,
              opacity: geometry.slot === 0 ? 0 : 1,
            },
            indicator,
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key]?.options;
          const label = typeof options?.title === "string" ? options.title : route.name;
          const tint = focused ? color.onPrimaryContainer : color.textSecondary;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
              style={({ pressed }) => [
                styles.item,
                { gap: space.xxs, opacity: pressed ? 1 - opacity.pressed * 3 : 1 },
              ]}
            >
              <View
                onLayout={(event) => {
                  if (index === 0) {
                    const top = event.nativeEvent.layout.y;
                    setGeometry((current) => ({ ...current, top }));
                  }
                }}
                style={[styles.indicator, { width: INDICATOR_WIDTH, height: INDICATOR_HEIGHT }]}
              >
                {options?.tabBarIcon?.({ focused, color: tint, size: theme.iconSize.md })}
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  textStyle.caption,
                  {
                    // Active: bold, under the green indicator (legible on glass in every case).
                    color: focused ? color.textPrimary : color.textSecondary,
                    fontFamily: focused
                      ? theme.textStyle.subtitle.fontFamily
                      : textStyle.caption.fontFamily,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Outer layer carries the soft offset shadow; the inner one clips the glass.
  shadow: {
    position: "absolute",
    borderRadius: radius.full,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 8,
  },
  glass: {
    flex: 1,
    flexDirection: "row",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  indicator: { alignItems: "center", justifyContent: "center" },
  sliding: { position: "absolute", left: 0 },
});
