import { BRAND_BANDS, BRAND_MARK, BRAND_MARK_HEIGHT, BRAND_MARK_WIDTH, STAR_POINTS } from "@bgs/ui";
import Svg, { Path, Polygon } from "react-native-svg";

/**
 * The official BIC-GOUV icon, still: three bands hanging from the top, the green
 * star over the yellow one. Drawn from the same figures as the launch animation.
 */
export function BrandMark({ height }: { height: number }) {
  const width = (height * BRAND_MARK_WIDTH) / BRAND_MARK_HEIGHT;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${String(BRAND_MARK_WIDTH)} ${String(BRAND_MARK_HEIGHT)}`}
      accessible={false}
    >
      {BRAND_BANDS.map((band) => (
        <Path
          key={band.colour}
          d={`M${String(band.x)} 0h${String(band.width)}v${String(band.height)}h${String(-band.width)}Z`}
          fill={BRAND_MARK[band.colour]}
        />
      ))}
      <Polygon points={STAR_POINTS} fill={BRAND_MARK.green} />
    </Svg>
  );
}
