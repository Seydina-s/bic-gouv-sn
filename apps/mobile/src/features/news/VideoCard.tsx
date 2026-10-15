import type { Block, Cover } from "@bgs/shared-types";
import { PlayIcon as Play } from "phosphor-react-native/src/icons/Play";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { CoverImage } from "./CoverImage";
import { siteOf } from "./institution";
import { openVideo } from "./open-video";

type VideoBlock = Extract<Block, { type: "video" }>;

/** Where the video plays, as people write it: "YouTube", "interieur.gouv.sn". */
function hostOf(block: VideoBlock): string {
  return block.provider === "youtube" ? "YouTube" : siteOf(block.url);
}

/**
 * Official video (GOV-17): a preview with a play button, the article's own photo when
 * it has one, then the video's title and its site. On tap the video plays from the
 * official site in a tab inside the app. No embedded player: lighter on modest phones,
 * and nothing reaches the video host until the reader asks.
 */
export function VideoCard({ block, poster }: { block: VideoBlock; poster: Cover | null }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { color, space, textStyle, radius, touchTarget, layout } = theme;
  const title =
    (block.provider === "official" ? block.title : undefined) ?? t("article.watchVideo");
  const host = t("article.videoHost", { host: hostOf(block) });
  const disc = touchTarget.min + space.lg;

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${host}`}
      onPress={() =>
        void openVideo(block.url, { toolbar: color.background, controls: color.textBrand })
      }
      style={({ pressed }) => [
        {
          gap: space.sm,
          marginBottom: space.lg,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
      testID="video-card"
    >
      <View
        style={[styles.frame, { borderRadius: radius.md, backgroundColor: color.primaryContainer }]}
      >
        {poster !== null && (
          <CoverImage
            cover={poster}
            slotWidth={Math.min(width, layout.readingMaxWidth)}
            style={StyleSheet.absoluteFill}
          />
        )}
        <View
          style={[
            styles.disc,
            {
              width: disc,
              height: disc,
              borderRadius: radius.full,
              backgroundColor: color.surfaceRaised,
              borderColor: color.glassBorder,
              shadowColor: color.scrim,
            },
          ]}
        >
          <Icon icon={Play} size="lg" weight="fill" color={color.textBrand} />
        </View>
      </View>
      <View>
        <Text style={[textStyle.label, { color: color.textPrimary }]}>{title}</Text>
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>{host}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    aspectRatio: 16 / 9,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  disc: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    // The same soft lift as the floating buttons: the disc reads above any photo.
    elevation: 3,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
