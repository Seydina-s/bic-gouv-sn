import { BRAND_MARK } from "@bgs/ui";
import Svg, { Path, Polygon } from "react-native-svg";

/** The drawing area of the official icon file (assets/brand/icon-source.svg). */
export const BRAND_MARK_WIDTH = 375.13;
export const BRAND_MARK_HEIGHT = 832.47;

/**
 * The official BIC-GOUV icon (owner, 03/10/2026): the flag's three bands, the
 * middle one longer and carrying the star. Its shapes are copied from the
 * institution's file, never redrawn; the app icons come from the same file
 * (scripts/app-icons.ts).
 */
export function BrandMark({ height }: { height: number }) {
  return (
    <Svg
      width={(height * BRAND_MARK_WIDTH) / BRAND_MARK_HEIGHT}
      height={height}
      viewBox={`0 0 ${String(BRAND_MARK_WIDTH)} ${String(BRAND_MARK_HEIGHT)}`}
    >
      <Path d="M157.99 0h59.16v832.47h-59.16Z" fill={BRAND_MARK.yellow} />
      <Path d="M320.56 0h54.57v605.06h-54.57Z" fill={BRAND_MARK.red} />
      <Path d="M0 0h53.2v605.07h-53.2Z" fill={BRAND_MARK.green} />
      <Polygon
        points="199.92 436.24 187.57 429.4 175.21 436.24 177.57 421.76 167.58 411.51 181.39 409.4 187.57 396.23 193.74 409.4 207.56 411.51 197.56 421.76 199.92 436.24"
        fill={BRAND_MARK.green}
      />
    </Svg>
  );
}
