import type { Cover } from "@bgs/shared-types";
import { Image } from "expo-image";
import { useWindowDimensions, type ImageStyle, type StyleProp } from "react-native";
import { useTheme } from "../../theme/useTheme";

/**
 * WebP first: decoded by every supported Android and iOS version, cheaper than
 * AVIF on entry-level phones; JPEG is the universal fallback.
 */
const FORMAT_PREFERENCE = ["webp", "jpeg", "avif"] as const;

/** Smallest source at least as wide as the slot on this screen, else the widest. */
export function pickCoverSource(cover: Cover, slotWidth: number, pixelRatio: number) {
  const format =
    FORMAT_PREFERENCE.find((candidate) => cover.sources.some((s) => s.format === candidate)) ??
    "jpeg";
  const sources = cover.sources
    .filter((source) => source.format === format)
    .sort((a, b) => a.width - b.width);
  const needed = slotWidth * pixelRatio;
  return sources.find((source) => source.width >= needed) ?? sources.at(-1) ?? cover.sources[0];
}

export interface CoverImageProps {
  cover: Cover;
  /** Width of the slot in density-independent pixels, to pick the right variant. */
  slotWidth: number;
  style?: StyleProp<ImageStyle>;
}

/**
 * Official cover photo, decorative next to its title (the title carries the
 * meaning for screen readers). The BlurHash fills the slot while it loads.
 */
export function CoverImage({ cover, slotWidth, style }: CoverImageProps) {
  const { theme } = useTheme();
  // Screen density, updated live (external display, fold/unfold).
  const { scale } = useWindowDimensions();
  const source = pickCoverSource(cover, slotWidth, scale);
  return (
    <Image
      source={source === undefined ? null : { uri: source.url }}
      placeholder={{ blurhash: cover.blurhash }}
      contentFit="cover"
      transition={theme.motion.duration.normal}
      recyclingKey={source?.url ?? null}
      testID="cover-image"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ backgroundColor: theme.color.surface }, style]}
    />
  );
}
