import { View } from "react-native";
import Svg, { Path } from "react-native-svg";

/**
 * Fine-line baobab (brand motif, CLAUDE.md §1): drawn for this project, not an
 * official emblem. Shown once per view as a faint watermark (3–6 % opacity).
 */
const STROKES = [
  "M18 116H102",
  "M44 116C46 99 41 82 45 63",
  "M76 116C74 99 79 82 75 63",
  "M45 63C39 55 30 51 21 43",
  "M50 61C48 50 45 40 42 29",
  "M60 61C60 49 61 38 60 25",
  "M70 61C73 50 78 41 84 31",
  "M75 63C82 57 90 53 99 47",
  "M21 43L15 37M21 43L19 34",
  "M42 29L36 22M42 29L44 20",
  "M60 25L55 17M60 25L65 17",
  "M84 31L81 22M84 31L91 25",
  "M99 47L105 41M99 47L106 50",
];

export function Baobab({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120" opacity={opacity}>
        {STROKES.map((d) => (
          <Path key={d} d={d} stroke={color} strokeWidth={1.2} strokeLinecap="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}
