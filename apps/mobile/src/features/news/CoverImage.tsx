import type { Cover } from "@bgs/shared-types";
import { Image } from "expo-image";
import { useState } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useDataSaver } from "../data-saver/DataSaverProvider";
import { ShowPhotoButton } from "../data-saver/ShowPhotoButton";
import { useTheme } from "../../theme/useTheme";

/**
 * WebP first: decoded by every supported Android and iOS version, cheaper than
 * AVIF on entry-level phones; JPEG is the universal fallback.
 */
const FORMAT_PREFERENCE = ["webp", "jpeg", "avif"] as const;

/**
 * Smallest source at least as wide as the slot on this screen, else the widest.
 * Saving data, the lightest source whatever the slot.
 */
export function pickCoverSource(
  cover: Cover,
  slotWidth: number,
  pixelRatio: number,
  lightest = false,
) {
  const format =
    FORMAT_PREFERENCE.find((candidate) => cover.sources.some((s) => s.format === candidate)) ??
    "jpeg";
  const sources = cover.sources
    .filter((source) => source.format === format)
    .sort((a, b) => a.width - b.width);
  if (lightest) {
    return sources[0] ?? cover.sources[0];
  }
  const needed = slotWidth * pixelRatio;
  return sources.find((source) => source.width >= needed) ?? sources.at(-1) ?? cover.sources[0];
}

export interface CoverImageProps {
  cover: Cover;
  /** Width of the slot in density-independent pixels, to pick the right variant. */
  slotWidth: number;
  style?: StyleProp<ImageStyle>;
  /** Spoken description; without it the photo is decorative (its title speaks). */
  label?: string;
  /**
   * Saving data, a button loads the photo (inside an article). Elsewhere (lists)
   * only its colours show: the story's title opens it anyway.
   */
  onDemand?: boolean;
}

/**
 * Official photo in lighter variants. Next to a title it is decorative (the title
 * carries the meaning for screen readers); inside an article it gets a label.
 * The BlurHash fills the slot while it loads, and stands in for it when saving data.
 */
export function CoverImage({ cover, slotWidth, style, label, onDemand = false }: CoverImageProps) {
  const { theme } = useTheme();
  const { saving } = useDataSaver();
  const [asked, setAsked] = useState(false);
  // Screen density, updated live (external display, fold/unfold).
  const { scale } = useWindowDimensions();
  const waiting = saving && !asked;
  const source = waiting ? undefined : pickCoverSource(cover, slotWidth, scale, saving);
  const image = (
    <Image
      source={source === undefined ? null : { uri: source.url }}
      placeholder={{ blurhash: cover.blurhash }}
      contentFit="cover"
      transition={theme.motion.duration.normal}
      recyclingKey={source?.url ?? null}
      testID="cover-image"
      accessible={label !== undefined}
      {...(label === undefined ? {} : { accessibilityLabel: label })}
      importantForAccessibility={label === undefined ? "no-hide-descendants" : "yes"}
      style={[
        { backgroundColor: theme.color.surface },
        waiting && onDemand ? StyleSheet.absoluteFill : style,
      ]}
    />
  );
  if (!(waiting && onDemand)) {
    return image;
  }
  // The frame takes the photo's size and place (callers only size and place it).
  const frame = style as StyleProp<ViewStyle>;
  return (
    <View style={[{ backgroundColor: theme.color.surface }, frame]}>
      {image}
      <ShowPhotoButton
        onPress={() => {
          setAsked(true);
        }}
      />
    </View>
  );
}
