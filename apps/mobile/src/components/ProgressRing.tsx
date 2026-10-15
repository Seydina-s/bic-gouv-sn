import { StyleSheet } from "react-native";
import Animated, { useAnimatedProps, type SharedValue } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps {
  /** From 0 (nothing yet) to 1 (complete); read on the UI thread. */
  progress: SharedValue<number>;
  /** Outer size of the ring, the size of the round button it surrounds. */
  size: number;
  thickness: number;
  color: string;
  trackColor: string;
}

/**
 * A thin ring around a round button, filling clockwise from the top as `progress`
 * grows: how far down a page the reader is, how much of an article was heard. Drawn
 * on the UI thread, it never slows a scroll. Decorative: the button names itself.
 */
export function ProgressRing({ progress, size, thickness, color, trackColor }: ProgressRingProps) {
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const centre = size / 2;
  const filled = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - Math.min(1, Math.max(0, progress.value))),
  }));
  return (
    <Svg
      width={size}
      height={size}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Circle
        cx={centre}
        cy={centre}
        r={radius}
        stroke={trackColor}
        strokeWidth={thickness}
        fill="none"
      />
      <AnimatedCircle
        cx={centre}
        cy={centre}
        r={radius}
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={filled}
        fill="none"
        // Starts at the top and turns clockwise.
        transform={`rotate(-90 ${String(centre)} ${String(centre)})`}
        testID="progress-ring"
      />
    </Svg>
  );
}
