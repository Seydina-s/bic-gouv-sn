import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import {
  BAOBAB_CROWN,
  BAOBAB_GROUND,
  BAOBAB_LIMB_OUTLINE,
  BAOBAB_LIMBS,
  BAOBAB_TRUNK,
} from "./baobab-drawing";

/**
 * The baobab silhouette (brand motif, CLAUDE.md §1; drawing in baobab-drawing.ts).
 * Shown once per view as a faint watermark (3–6 % opacity), never behind long text.
 */
export function Baobab({ size, color, opacity }: { size: number; color: string; opacity: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 120 120" opacity={opacity}>
        <Path
          d={BAOBAB_GROUND.d}
          stroke={color}
          strokeWidth={0.9}
          strokeLinecap="round"
          fill="none"
        />
        <Path d={BAOBAB_TRUNK.d} stroke={color} strokeWidth={1.1} fill={color} />
        {BAOBAB_LIMBS.map((limb) => (
          <Path
            key={limb.d}
            d={limb.d}
            stroke={color}
            strokeWidth={BAOBAB_LIMB_OUTLINE}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={color}
          />
        ))}
        {BAOBAB_CROWN.map((level) => (
          <Path
            key={level.width}
            d={level.d}
            stroke={color}
            strokeWidth={level.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}
