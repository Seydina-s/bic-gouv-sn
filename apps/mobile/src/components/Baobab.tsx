import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { BAOBAB_OUTLINE, BAOBAB_SIZE } from "./baobab-drawing";

/**
 * The baobab silhouette (brand motif, CLAUDE.md §1; drawing in baobab-drawing.ts).
 * Shown once per view as a faint watermark (3–6 % opacity), never behind long text.
 */
export function Baobab({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${String(BAOBAB_SIZE)} ${String(BAOBAB_SIZE)}`}
        opacity={opacity}
      >
        <Path d={BAOBAB_OUTLINE} fill={color} fillRule="evenodd" />
      </Svg>
    </View>
  );
}
