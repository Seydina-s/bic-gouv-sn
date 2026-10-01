import { CheckIcon as Check } from "phosphor-react-native/src/icons/Check";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { Baobab } from "../../components/Baobab";
import { Icon } from "../../components/Icon";
import { useReduceMotion } from "../../theme/useSystemAccessibility";
import { useTheme } from "../../theme/useTheme";
import { fit, PATH_BOX, ROAD, ROAD_LENGTH, STATIONS, undrawnAt } from "./onboarding-path";

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The baobab watermark sits in the road's free corner (drawing units). */
const WATERMARK = { x: 250, y: 262, size: 140 } as const;
/** Station size in drawing units: shrinks with the drawing on small screens. */
const STATION = 56;
const ROAD_WIDTH = 8;
const DOTS = "2 12";

/** The yellow halo breathing around the station in progress (none with reduced motion). */
function Halo({ size, still }: { size: number; still: boolean }) {
  const { theme } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = still
      ? 0
      : withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.ease) }), -1);
  }, [still, pulse]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.85 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: size / 2, backgroundColor: theme.color.accent },
        style,
      ]}
    />
  );
}

/**
 * The welcome as a road (direction A, chosen by the user on 01/10/2026): stations
 * climb from the language to the last idea; each step reached draws the road up
 * to its station, done stations fill with green and a check, the current one
 * breathes in the flag's yellow. Decorative for screen readers: the step count
 * says the same thing in words.
 */
export function OnboardingPath({ index, labels }: { index: number; labels: readonly string[] }) {
  const { theme } = useTheme();
  const reduceMotion = useReduceMotion();
  const still = reduceMotion !== false;
  const [box, setBox] = useState({ width: 0, height: 0 });
  const undrawn = useSharedValue(undrawnAt(index));
  const { color, textStyle, space } = theme;

  useEffect(() => {
    const target = undrawnAt(index);
    undrawn.value = still
      ? target
      : withTiming(target, { duration: 750, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [index, still, undrawn]);
  const road = useAnimatedProps(() => ({ strokeDashoffset: undrawn.value }));

  const { scale, left, top } = fit(box.width, box.height);
  const size = STATION * Math.min(1, scale);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setBox({ width, height });
      }}
    >
      {box.width > 0 && (
        <>
          <View
            style={{
              position: "absolute",
              left: left + WATERMARK.x * scale,
              top: top + WATERMARK.y * scale,
            }}
          >
            <Baobab
              size={WATERMARK.size * scale}
              color={color.textBrand}
              opacity={theme.opacity.watermark}
            />
          </View>
          <Svg
            width={PATH_BOX.width * scale}
            height={PATH_BOX.height * scale}
            viewBox={`0 0 ${String(PATH_BOX.width)} ${String(PATH_BOX.height)}`}
            style={{ position: "absolute", left, top }}
          >
            <Path
              d={ROAD}
              fill="none"
              stroke={color.border}
              strokeWidth={ROAD_WIDTH - 2}
              strokeLinecap="round"
              strokeDasharray={DOTS}
            />
            <AnimatedPath
              d={ROAD}
              fill="none"
              stroke={color.primary}
              strokeWidth={ROAD_WIDTH}
              strokeLinecap="round"
              strokeDasharray={[ROAD_LENGTH, ROAD_LENGTH]}
              animatedProps={road}
            />
          </Svg>
          {STATIONS.map((station, i) => {
            const done = i < index;
            const current = i === index;
            const x = left + station.x * scale;
            const y = top + station.y * scale;
            // Labels on the open side of the road: right of the left stations.
            const onRight = station.x < PATH_BOX.width / 2;
            return (
              <View key={labels[i] ?? i}>
                <View
                  style={[
                    styles.station,
                    { left: x - size / 2, top: y - size / 2, width: size, height: size },
                  ]}
                >
                  {current && <Halo size={size} still={still} />}
                  <View
                    style={[
                      styles.disc,
                      {
                        borderRadius: size / 2,
                        borderWidth: 3,
                        borderColor: done || current ? color.primary : color.border,
                        backgroundColor: done ? color.primary : color.background,
                      },
                    ]}
                  >
                    {done ? (
                      <Icon icon={Check} weight="bold" color={color.onPrimary} />
                    ) : (
                      <Text
                        style={[
                          textStyle.subtitle,
                          { color: current ? color.textBrand : color.textTertiary },
                        ]}
                      >
                        {String(i + 1)}
                      </Text>
                    )}
                  </View>
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    textStyle.label,
                    styles.label,
                    {
                      top: y - textStyle.label.lineHeight / 2,
                      color: done || current ? color.textPrimary : color.textTertiary,
                    },
                    onRight
                      ? { left: x + size / 2 + space.md }
                      : { right: box.width - x + size / 2 + space.md },
                  ]}
                >
                  {labels[i]}
                </Text>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  station: { position: "absolute", alignItems: "center", justifyContent: "center" },
  disc: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { position: "absolute" },
});
