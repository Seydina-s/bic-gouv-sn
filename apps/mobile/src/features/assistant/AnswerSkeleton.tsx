import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";

/** Widths of the placeholder lines: the shape of a short answer. */
const LINES = ["100%", "92%", "64%"] as const;

/** While the answer is written: its shape, breathing slowly (still with reduced motion). */
export function AnswerSkeleton() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { color, space, radius, textStyle } = theme;
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value =
      reduceMotion !== false
        ? 0
        : withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [reduceMotion, breath]);
  const breathing = useAnimatedStyle(() => ({ opacity: 1 - breath.value * 0.45 }));

  return (
    <View style={{ gap: space.md }}>
      <Animated.View accessible={false} style={[{ gap: space.sm }, breathing]}>
        {LINES.map((width) => (
          <View
            key={width}
            style={[
              styles.line,
              { width, height: space.md, borderRadius: radius.sm, backgroundColor: color.border },
            ]}
          />
        ))}
      </Animated.View>
      <Text
        accessibilityLiveRegion="polite"
        style={[textStyle.bodySmall, { color: color.textSecondary }]}
      >
        {t("assistant.asking")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { alignSelf: "flex-start" },
});
