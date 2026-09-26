import type { Block, Inline } from "@bgs/shared-types";
import { Image } from "expo-image";
import { useState } from "react";
import { PlayCircleIcon as PlayCircle } from "phosphor-react-native/src/icons/PlayCircle";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type TextStyle,
} from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { CoverImage } from "./CoverImage";

function Runs({ inlines }: { inlines: Inline[] }) {
  const { theme } = useTheme();
  return inlines.map((run, index) => {
    const style: TextStyle = {
      fontFamily: run.bold === true ? theme.textStyle.subtitle.fontFamily : undefined,
      fontStyle: run.italic === true ? "italic" : undefined,
      textDecorationLine:
        run.underline === true || run.href !== undefined ? "underline" : undefined,
      color: run.href !== undefined ? theme.color.textBrand : undefined,
    };
    const href = run.href;
    return (
      <Text
        // Runs never reorder: the index is a stable key here.
        key={index}
        style={style}
        accessibilityRole={href === undefined ? undefined : "link"}
        onPress={href === undefined ? undefined : () => void Linking.openURL(href)}
      >
        {run.text}
      </Text>
    );
  });
}

type ImageBlock = Extract<Block, { type: "image" }>;

/** Image in the text: our stored lighter copies when available, else the official file. */
function ArticleImage({ block }: { block: ImageBlock }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [ratio, setRatio] = useState(16 / 9);
  const { src, alt, media } = block;
  if (media !== undefined) {
    return (
      <CoverImage
        cover={media}
        slotWidth={Math.min(width, theme.layout.readingMaxWidth)}
        label={alt ?? t("article.image")}
        style={[
          styles.image,
          { aspectRatio: media.width / media.height, borderRadius: theme.radius.md },
        ]}
      />
    );
  }
  return (
    <Image
      source={{ uri: src }}
      accessibilityLabel={alt ?? t("article.image")}
      contentFit="cover"
      transition={theme.motion.duration.normal}
      onLoad={(event) => {
        setRatio(event.source.width / Math.max(event.source.height, 1));
      }}
      style={[
        styles.image,
        { aspectRatio: ratio, borderRadius: theme.radius.md, backgroundColor: theme.color.surface },
      ]}
    />
  );
}

/** Renders the API's structured blocks with native components: no web view, no HTML. */
export function BlockRenderer({ blocks }: { blocks: Block[] }) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  const text = { color: color.textPrimary, marginBottom: space.lg };

  return blocks.map((block, index) => {
    const key = `${block.type}-${String(index)}`;
    switch (block.type) {
      case "paragraph":
        return (
          <Text key={key} style={[textStyle.body, text]}>
            <Runs inlines={block.inlines} />
          </Text>
        );
      case "heading":
        return (
          <Text
            key={key}
            accessibilityRole="header"
            style={[textStyle.subtitle, text, { marginTop: space.sm }]}
          >
            <Runs inlines={block.inlines} />
          </Text>
        );
      case "quote":
        return (
          <View key={key} style={{ paddingLeft: space.xl, marginBottom: space.lg }}>
            <Text style={[textStyle.body, { color: color.textSecondary, fontStyle: "italic" }]}>
              <Runs inlines={block.inlines} />
            </Text>
          </View>
        );
      case "list":
        return (
          <View key={key} style={{ marginBottom: space.lg }}>
            {block.items.map((item, itemIndex) => (
              <View
                key={itemIndex}
                style={[styles.listItem, { gap: space.sm, marginBottom: space.xs }]}
              >
                <Text style={[textStyle.body, { color: color.textBrand }]}>
                  {block.ordered ? `${String(itemIndex + 1)}.` : "•"}
                </Text>
                <Text style={[textStyle.body, styles.flex, { color: color.textPrimary }]}>
                  <Runs inlines={item} />
                </Text>
              </View>
            ))}
          </View>
        );
      case "image":
        return (
          <View key={key} style={{ marginBottom: space.lg }}>
            <ArticleImage block={block} />
          </View>
        );
      case "video":
        return <VideoCard key={key} url={block.url} />;
    }
  });
}

/**
 * Official video: a card that opens it in YouTube on tap. No embedded player:
 * lighter on modest phones, and nothing reaches the video host until the reader asks.
 */
function VideoCard({ url }: { url: string }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius } = theme;
  const title = t("article.watchVideo");
  const host = t("article.videoHost");
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${host}`}
      onPress={() => void Linking.openURL(url)}
      style={({ pressed }) => [
        styles.video,
        {
          gap: space.md,
          padding: space.lg,
          marginBottom: space.lg,
          minHeight: theme.touchTarget.min,
          borderRadius: radius.md,
          backgroundColor: color.primaryContainer,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      <Icon icon={PlayCircle} size="lg" weight="fill" color={color.onPrimaryContainer} />
      <View style={styles.flex}>
        <Text style={[textStyle.label, { color: color.onPrimaryContainer }]}>{title}</Text>
        <Text style={[textStyle.bodySmall, { color: color.onPrimaryContainer }]}>{host}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  video: { flexDirection: "row", alignItems: "center" },
  image: { width: "100%" },
  listItem: { flexDirection: "row" },
  flex: { flex: 1 },
});
