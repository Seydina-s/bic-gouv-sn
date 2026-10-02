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
import Svg, { Circle, Path } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { BAOBAB_FOOT, BAOBAB_OUTLINE, BAOBAB_SIZE } from "../../components/baobab-drawing";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { VEIL_OPACITIES, VEIL_STROKE, veilRadius } from "./launch-growth";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The baobab's size: half the screen's narrow side, within reason (majestic). */
const SHARE = 0.5;
const MAX_SIZE = 280;

/** A ring the colour of the screen over the part of the tree not grown yet. */
function Veil({
  index,
  veilOpacity,
  progress,
  color,
}: {
  index: number;
  veilOpacity: number;
  progress: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => ({ r: veilRadius(progress.value, index) }));
  return (
    <AnimatedCircle
      cx={BAOBAB_FOOT.x}
      cy={BAOBAB_FOOT.y}
      stroke={color}
      strokeWidth={VEIL_STROKE}
      strokeOpacity={veilOpacity}
      fill="none"
      animatedProps={props}
    />
  );
}

/**
 * The launch (charter, CLAUDE.md §1): the baobab grows in a second out of the
 * foot of its trunk, up its limbs to the leaves; just before the front page it
 * withdraws the same way in reverse, leaves first (owner's request, 02/10/2026),
 * and fades into the app. Never in the way: the app loads beneath and can be
 * touched at once; skipped when the phone asks for less motion.
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
      withTiming(1, { duration: launchDraw, easing: Easing.out(Easing.cubic) }),
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
      <Svg width={size} height={size} viewBox={`0 0 ${String(BAOBAB_SIZE)} ${String(BAOBAB_SIZE)}`}>
        <Path d={BAOBAB_OUTLINE} fill={color.textBrand} fillRule="evenodd" />
        {VEIL_OPACITIES.map((veilOpacity, index) => (
          <Veil
            key={`${String(index)}-${String(veilOpacity)}`}
            index={index}
            veilOpacity={veilOpacity}
            progress={progress}
            color={color.background}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
