import {
  BRAND_BANDS,
  BRAND_MARK,
  BRAND_MARK_HEIGHT,
  BRAND_MARK_WIDTH,
  STAR_CENTER,
  STAR_POINTS,
  STAR_RADIUS,
  type BrandBand,
} from "@bgs/ui";
import { useEffect, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import { scheduleOnRN } from "react-native-worklets";
import { BAOBAB_FOOT, BAOBAB_OUTLINE, BAOBAB_SIZE } from "../../components/baobab-drawing";
import { useTranslation } from "../../i18n/useTranslation";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { VEIL_OPACITIES, VEIL_STROKE, veilRadius } from "./launch-growth";
import {
  bandGrowth,
  easeOut,
  fallProgress,
  foldProgress,
  launchSchedule,
  layerOpacity,
  namePresence,
  ringSpread,
  seedPresence,
  starScale,
  starTurn,
  treeGrowth,
} from "./launch-seed";
import { LAUNCH_MARK_HEIGHT } from "./native-splash";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The baobab's size: half the screen's narrow side, within reason (majestic). */
const SHARE = 0.5;
const MAX_SIZE = 280;
/** The icon's scale from its file to the screen. */
const K = LAUNCH_MARK_HEIGHT / BRAND_MARK_HEIGHT;
const MARK_WIDTH = BRAND_MARK_WIDTH * K;
/** The ring of light around the star, at its widest, and the seed. */
const RING_SIZE = 88;
const SEED_SIZE = 8;

/** One band of the icon, growing out of the star up and down. */
function GrowingBand({
  band,
  index,
  clock,
}: {
  band: BrandBand;
  index: number;
  clock: SharedValue<number>;
}) {
  const props = useAnimatedProps(() => {
    const open = bandGrowth(clock.value, index);
    const top = STAR_CENTER.y * (1 - open);
    const tall = Math.max(0, STAR_CENTER.y + (band.height - STAR_CENTER.y) * open - top);
    return {
      d: `M${String(band.x)} ${String(top)}h${String(band.width)}v${String(tall)}h${String(-band.width)}Z`,
    };
  });
  return <AnimatedPath fill={BRAND_MARK[band.colour]} animatedProps={props} />;
}

/** A ring the colour of the screen over the part of the tree not grown yet. */
function Veil({
  index,
  veilOpacity,
  growth,
  color,
}: {
  index: number;
  veilOpacity: number;
  growth: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => ({ r: veilRadius(growth.value, index) }));
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
 * The launch (direction C, "the seed", owner's choice, 03/10/2026): the star of the
 * official icon, left on screen by the phone's own launch screen, lights up; the
 * three bands grow out of it and the app's name appears below, as Google's apps
 * show theirs; the icon stays, then folds back into the star, which drops to the
 * ground like a seed; the baobab grows out of it, withdraws, and the app appears.
 * Never in the way: the app loads beneath and can be touched at once; skipped when
 * the phone asks for less motion. Timing in launch-seed.ts.
 */
export function LaunchLayer({ onDone }: { onDone: () => void }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const clock = useSharedValue(0);
  const { color, motion, space, textStyle } = theme;
  const schedule = useMemo(() => launchSchedule(motion.duration), [motion.duration]);

  // The star sits at the centre of the screen, where the phone's launch screen left it.
  const centreX = width / 2;
  const centreY = height / 2;
  const markLeft = centreX - STAR_CENTER.x * K;
  const markTop = centreY - STAR_CENTER.y * K;
  const treeSize = Math.min(Math.min(width, height) * SHARE, MAX_SIZE);
  const treeLeft = centreX - treeSize / 2;
  const treeTop = centreY - treeSize / 2;
  const footY = treeTop + (treeSize * BAOBAB_FOOT.y) / BAOBAB_SIZE;

  useEffect(() => {
    if (reduceMotion === null) {
      return;
    }
    if (reduceMotion) {
      onDone();
      return;
    }
    clock.value = withTiming(
      schedule.end,
      { duration: schedule.end, easing: Easing.linear },
      (finished) => {
        if (finished === true) {
          scheduleOnRN(onDone);
        }
      },
    );
  }, [reduceMotion, onDone, clock, schedule]);

  const growth = useDerivedValue(() => treeGrowth(clock.value, schedule));
  const layer = useAnimatedStyle(() => ({ opacity: layerOpacity(clock.value, schedule) }));
  const fold = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - foldProgress(clock.value, schedule) }],
  }));
  const star = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${String(starTurn(clock.value))}deg` },
      { scale: starScale(clock.value) },
    ],
  }));
  const ring = useAnimatedStyle(() => {
    const spread = ringSpread(clock.value);
    return {
      opacity: spread > 0 && spread < 1 ? 0.6 * (1 - spread) : 0,
      transform: [{ scale: 0.1 + 0.9 * easeOut(spread) }],
    };
  });
  const name = useAnimatedStyle(() => {
    const presence = namePresence(clock.value, schedule);
    return { opacity: presence, transform: [{ translateY: (1 - presence) * space.sm }] };
  });
  const seed = useAnimatedStyle(() => ({
    opacity: seedPresence(clock.value, schedule),
    transform: [{ translateY: fallProgress(clock.value, schedule) * (footY - centreY) }],
  }));

  return (
    <Animated.View
      testID="launch-layer"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: color.background }, layer]}
    >
      <Svg
        width={treeSize}
        height={treeSize}
        viewBox={`0 0 ${String(BAOBAB_SIZE)} ${String(BAOBAB_SIZE)}`}
        style={[styles.at, { left: treeLeft, top: treeTop }]}
      >
        <Path d={BAOBAB_OUTLINE} fill={color.textBrand} fillRule="evenodd" />
        {VEIL_OPACITIES.map((veilOpacity, index) => (
          <Veil
            key={`${String(index)}-${String(veilOpacity)}`}
            index={index}
            veilOpacity={veilOpacity}
            growth={growth}
            color={color.background}
          />
        ))}
      </Svg>
      <Animated.View
        style={[
          styles.at,
          styles.ring,
          {
            left: centreX - RING_SIZE / 2,
            top: centreY - RING_SIZE / 2,
            width: RING_SIZE,
            height: RING_SIZE,
            borderColor: BRAND_MARK.green,
          },
          ring,
        ]}
      />
      <Animated.View
        testID="launch-mark"
        style={[
          styles.at,
          {
            left: markLeft,
            top: markTop,
            width: MARK_WIDTH,
            height: LAUNCH_MARK_HEIGHT,
            transformOrigin: [STAR_CENTER.x * K, STAR_CENTER.y * K, 0],
          },
          fold,
        ]}
      >
        <Svg
          width={MARK_WIDTH}
          height={LAUNCH_MARK_HEIGHT}
          viewBox={`0 0 ${String(BRAND_MARK_WIDTH)} ${String(BRAND_MARK_HEIGHT)}`}
        >
          {BRAND_BANDS.map((band, index) => (
            <GrowingBand key={band.colour} band={band} index={index} clock={clock} />
          ))}
        </Svg>
        <Animated.View
          style={[
            styles.at,
            {
              left: (STAR_CENTER.x - STAR_RADIUS) * K,
              top: (STAR_CENTER.y - STAR_RADIUS) * K,
            },
            star,
          ]}
        >
          <Svg
            width={2 * STAR_RADIUS * K}
            height={2 * STAR_RADIUS * K}
            viewBox={`${String(STAR_CENTER.x - STAR_RADIUS)} ${String(STAR_CENTER.y - STAR_RADIUS)} ${String(2 * STAR_RADIUS)} ${String(2 * STAR_RADIUS)}`}
          >
            <Polygon points={STAR_POINTS} fill={BRAND_MARK.green} />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.Text
        style={[
          styles.at,
          styles.name,
          textStyle.headline,
          { top: markTop + LAUNCH_MARK_HEIGHT + space.xl, color: color.textPrimary },
          name,
        ]}
      >
        {t("app.name")}
      </Animated.Text>
      <Animated.View
        style={[
          styles.at,
          styles.seed,
          {
            left: centreX - SEED_SIZE / 2,
            top: centreY - SEED_SIZE / 2,
            width: SEED_SIZE,
            height: SEED_SIZE,
            backgroundColor: color.textBrand,
          },
          seed,
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  at: { position: "absolute" },
  ring: { borderRadius: RING_SIZE / 2, borderWidth: 2 },
  name: { left: 0, right: 0, textAlign: "center" },
  seed: { borderRadius: SEED_SIZE / 2 },
});
