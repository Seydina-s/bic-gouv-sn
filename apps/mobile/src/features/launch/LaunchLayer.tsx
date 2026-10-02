import { useEffect } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
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

/** The baobab's size: half the screen's narrow side, within reason (majestic). */
const SHARE = 0.5;
const MAX_SIZE = 280;

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
      strokeWidth={1.1}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={[STROKE_DASH, STROKE_DASH]}
      animatedProps={props}
    />
  );
}

/**
 * The launch (charter, CLAUDE.md §1): the baobab draws itself stroke by stroke in
 * a second, from the ground to the leaves; then, just before the front page, it is
 * taken back the same way in reverse, leaves first (user's request, 02/10/2026),
 * and fades into the app. Never in the way: the app loads beneath
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
    const { launchDraw, launchHold, launchUndraw } = motion.duration;
    progress.value = withSequence(
      withTiming(1, { duration: launchDraw, easing: Easing.inOut(Easing.cubic) }),
      withDelay(
        launchHold,
        withTiming(0, { duration: launchUndraw, easing: Easing.in(Easing.cubic) }),
      ),
    );
    opacity.value = withDelay(
      launchDraw + launchHold + launchUndraw * 0.7,
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
