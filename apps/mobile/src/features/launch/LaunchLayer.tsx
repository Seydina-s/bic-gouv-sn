import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { BAOBAB_STROKES } from "../../components/Baobab";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { STROKE_DASH, strokeProgress } from "./launch-strokes";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The baobab's size: a third of the screen's narrow side, within reason. */
const SHARE = 0.38;
const MAX_SIZE = 220;

function Stroke({
  d,
  index,
  progress,
  color,
}: {
  d: string;
  index: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => ({
    strokeDashoffset:
      STROKE_DASH * (1 - strokeProgress(progress.value, index, BAOBAB_STROKES.length)),
  }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={[STROKE_DASH, STROKE_DASH]}
      animatedProps={props}
    />
  );
}

/**
 * The launch (charter, CLAUDE.md §1): the baobab draws itself stroke by stroke in
 * about a second, then fades into the app. Never in the way: the app loads beneath
 * and can be touched at once; skipped when the phone asks for less motion.
 */
export function LaunchLayer({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const { color, motion } = theme;
  const size = Math.min(Math.min(width, height) * SHARE, MAX_SIZE);

  useEffect(() => {
    if (reduceMotion === null) {
      return;
    }
    if (reduceMotion) {
      onDone();
      return;
    }
    progress.value = withTiming(1, {
      duration: motion.duration.launchDraw,
      easing: Easing.inOut(Easing.cubic),
    });
    opacity.value = withDelay(
      motion.duration.launchDraw + motion.duration.launchHold,
      withTiming(0, { duration: motion.duration.launchFade }, (finished) => {
        if (finished === true) {
          scheduleOnRN(onDone);
        }
      }),
    );
  }, [reduceMotion, onDone, progress, opacity, motion]);

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      testID="launch-layer"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: color.background }, fade]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {BAOBAB_STROKES.map((d, index) => (
          <Stroke key={d} d={d} index={index} progress={progress} color={color.textBrand} />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
