import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { FlagStripe } from "../../components/FlagStripe";
import { GlassBackdrop } from "../../components/GlassBackdrop";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { AppActions } from "./AppActions";

export interface FloatingAppBarProps {
  /** Shown once the reader has scrolled (with "back to top"), hidden at the top. */
  visible: boolean;
  /** Space kept above the bar (status bar on screens without a header). */
  top?: number;
}

/**
 * Compact top bar of the app (flag, name, search, favorites, settings) sliding down
 * over any screen as soon as the reader scrolls, on frosted glass, so the settings
 * and the favorites are one tap away from anywhere. Out of reach while hidden.
 */
export function FloatingAppBar({ visible, top = 0 }: FloatingAppBarProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  // Built the first time it is needed: nothing to pay on a screen never scrolled.
  const [built, setBuilt] = useState(visible);
  if (visible && !built) {
    setBuilt(true);
  }
  const { color, space, textStyle, motion } = theme;

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

  if (!built) {
    return null;
  }
  return (
    <Animated.View
      pointerEvents={visible ? "box-none" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "auto" : "no-hide-descendants"}
      style={[
        styles.bar,
        {
          paddingTop: top,
          borderBottomColor: color.glassBorder,
          shadowColor: color.scrim,
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [-space.xxxl, 0],
              }),
            },
          ],
        },
      ]}
      testID="floating-app-bar"
    >
      <GlassBackdrop />
      <FlagStripe />
      <View style={[styles.row, { paddingLeft: space.lg, paddingRight: space.xs }]}>
        <Text
          style={[
            textStyle.subtitle,
            styles.flex,
            { fontFamily: textStyle.display.fontFamily, color: color.textBrand },
          ]}
        >
          {t("app.name")}
        </Text>
        <AppActions />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
    elevation: 4,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
