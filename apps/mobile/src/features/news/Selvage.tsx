import { View, type DimensionValue } from "react-native";
import Svg, { Circle, Defs, Line, Path, Pattern, Rect } from "react-native-svg";

/**
 * Pagne tissé motifs, kept in the "La Une" direction (D-05). Each section has its
 * own woven pattern, so the section can be told apart without relying on colour
 * alone. Always decorative: never behind text, hidden from screen readers.
 */
export const SELVAGE_WIDTH = 6;

type Draw = (color: string) => React.ReactNode;

const TILE = 8;

const PATTERNS: Record<string, Draw> = {
  "conseil-des-ministres": (c) => (
    <Path d="M0 6L3 2L6 6" stroke={c} strokeWidth={1.4} fill="none" />
  ),
  communiques: (c) => <Circle cx={3} cy={4} r={1.3} fill={c} />,
  international: (c) => <Line x1={0} y1={8} x2={6} y2={0} stroke={c} strokeWidth={1.2} />,
  discours: (c) => <Line x1={0} y1={4} x2={6} y2={4} stroke={c} strokeWidth={1.4} />,
  focus: (c) => <Path d="M3 1L5.5 4L3 7L0.5 4Z" fill={c} />,
  interviews: (c) => <Line x1={3} y1={1} x2={3} y2={5} stroke={c} strokeWidth={1.6} />,
  agenda: (c) => (
    <>
      <Line x1={0} y1={4} x2={6} y2={4} stroke={c} strokeWidth={0.9} />
      <Line x1={3} y1={0} x2={3} y2={8} stroke={c} strokeWidth={0.9} />
    </>
  ),
};

const PLAIN: Draw = (c) => <Line x1={3} y1={0} x2={3} y2={8} stroke={c} strokeWidth={1.2} />;

interface WeaveProps {
  category: string;
  color: string;
  width: DimensionValue;
  height: DimensionValue;
  /** Lays the pattern sideways, for a horizontal strip. */
  sideways?: boolean;
}

/** The section's woven pattern filling a box. */
function Weave({ category, color, width, height, sideways = false }: WeaveProps) {
  const draw = PATTERNS[category] ?? PLAIN;
  const id = `weave-${category}-${sideways ? "h" : "v"}`;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width, height }}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern
            id={id}
            width={SELVAGE_WIDTH}
            height={TILE}
            patternUnits="userSpaceOnUse"
            {...(sideways ? { patternTransform: "rotate(-90)" } : {})}
          >
            {draw(color)}
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Woven selvage along the leading edge of a story. */
export function Selvage({ category, color }: { category: string; color: string }) {
  return <Weave category={category} color={color} width={SELVAGE_WIDTH} height="100%" />;
}

/** Horizontal woven stripe, e.g. across the top of a highlighted card. */
export function WovenStrip({ category, color }: { category: string; color: string }) {
  return <Weave category={category} color={color} width="100%" height={SELVAGE_WIDTH} sideways />;
}

/** Small woven chip set before a section name: the pattern names the section. */
export function WovenSwatch({ category, color }: { category: string; color: string }) {
  return <Weave category={category} color={color} width={SELVAGE_WIDTH * 2} height={TILE * 1.5} />;
}
