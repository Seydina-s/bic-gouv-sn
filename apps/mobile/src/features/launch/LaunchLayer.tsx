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
import {
  BAOBAB_CROWN,
  BAOBAB_GROUND,
  BAOBAB_LIMB_OUTLINE,
  BAOBAB_LIMBS,
  BAOBAB_TRUNK,
  type DrawnPath,
} from "../../components/baobab-drawing";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { filledAfter, phase, staggered, TIMELINE } from "./launch-strokes";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The baobab's size: half the screen's narrow side, within reason (majestic). */
const SHARE = 0.5;
const MAX_SIZE = 280;

interface PartProps {
  progress: SharedValue<number>;
  window: readonly [number, number];
  color: string;
}

/** A path drawn along its length; a filled one fills in during `fillWindow`. */
function DrawnStroke({
  path,
  width,
  fillWindow,
  progress,
  window,
  color,
}: PartProps & { path: DrawnPath; width: number; fillWindow?: readonly [number, number] }) {
  const props = useAnimatedProps(() => ({
    strokeDashoffset: path.length * (1 - phase(progress.value, window)),
    fillOpacity: fillWindow === undefined ? 0 : phase(progress.value, fillWindow),
  }));
  return (
    <AnimatedPath
      d={path.d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fillWindow === undefined ? "none" : color}
      strokeDasharray={[path.length, path.length]}
      animatedProps={props}
    />
  );
}

/** A level of the crown, appearing as a whole. */
function CrownLevelPart({
  d,
  width,
  progress,
  window,
  color,
}: PartProps & { d: string; width: number }) {
  const props = useAnimatedProps(() => ({ opacity: phase(progress.value, window) }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      animatedProps={props}
    />
  );
}

/**
 * The launch (charter, CLAUDE.md §1): the baobab grows in a second, its ground,
 * trunk and limbs drawn stroke by stroke, then its crown up to the leaves; just
 * before the front page it is taken back the same way in reverse, leaves first
 * (owner's request, 02/10/2026), and fades into the app. Never in the way: the app
 * loads beneath and can be touched at once; skipped when the phone asks for less
 * motion.
 */
export function LaunchLayer({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const { color, motion } = theme;
  const size = Math.min(Math.min(width, height) * SHARE, MAX_SIZE);
  const ink = color.textBrand;

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
        <DrawnStroke
          path={BAOBAB_GROUND}
          width={0.9}
          progress={progress}
          window={TIMELINE.ground}
          color={ink}
        />
        <DrawnStroke
          path={BAOBAB_TRUNK}
          width={1.1}
          fillWindow={TIMELINE.trunkFill}
          progress={progress}
          window={TIMELINE.trunkOutline}
          color={ink}
        />
        {BAOBAB_LIMBS.map((limb, index) => {
          const window = staggered(TIMELINE.limbs, index, BAOBAB_LIMBS.length);
          return (
            <DrawnStroke
              key={limb.d}
              path={limb}
              width={BAOBAB_LIMB_OUTLINE}
              fillWindow={filledAfter(window)}
              progress={progress}
              window={window}
              color={ink}
            />
          );
        })}
        {BAOBAB_CROWN.map((level, index) => (
          <CrownLevelPart
            key={level.width}
            d={level.d}
            width={level.width}
            progress={progress}
            window={staggered(TIMELINE.crown, index, BAOBAB_CROWN.length)}
            color={ink}
          />
        ))}
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
