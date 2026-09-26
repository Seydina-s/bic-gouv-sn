import { ArrowUpIcon as ArrowUp } from "phosphor-react-native/src/icons/ArrowUp";
import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "../i18n/useTranslation";
import { useReduceMotion } from "../theme/useSystemAccessibility";
import { useTheme } from "../theme/useTheme";
import { Icon } from "./Icon";

export interface ScrollTopButtonProps {
  visible: boolean;
  /** Distance kept from the bottom edge (tab bar, system bar). */
  bottom: number;
  onPress: () => void;
}

/**
 * Small floating button, bottom right, shown once the reader has scrolled down:
 * brings the page back to the top. Fades and rises in (a cut with "reduce motion"),
 * and is out of reach of touches and screen readers while hidden.
 */
export function ScrollTopButton({ visible, bottom, onPress }: ScrollTopButtonProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const { color, space, radius, touchTarget, motion } = theme;

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
