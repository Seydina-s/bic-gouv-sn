import { StyleSheet, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useTheme } from "../theme/useTheme";

/** Points of a regular five-pointed star (tip up) inscribed in a circle of radius r. */
export function starPoints(r: number): string {
  // Inner radius of a regular star: r × sin(18°) / sin(126°) ≈ 0.382 r.
  const inner = (r * Math.sin(Math.PI / 10)) / Math.sin((7 * Math.PI) / 10);
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? r : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(r + radius * Math.cos(angle)).toFixed(2)},${(r + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
}

/**
 * The flag of Senegal as a thin stripe: green, yellow with its green star, red.
 * The star matters: without it, the same three bands are the flag of Mali.
 * Decoration only, identical in both themes.
 */
export function FlagStripe() {
  const { theme } = useTheme();
  const { flagGreen, flagYellow, flagRed } = theme.color;
  const height = theme.layout.flagStripe;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.stripe, { height }]}
    >
      <View style={[styles.band, { backgroundColor: flagGreen }]} />
      <View style={[styles.band, styles.center, { backgroundColor: flagYellow }]}>
        <Svg width={height} height={height} testID="flag-star">
          <Polygon points={starPoints(height / 2)} fill={flagGreen} />
        </Svg>
      </View>
      <View style={[styles.band, { backgroundColor: flagRed }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  stripe: { flexDirection: "row" },
  band: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
});
