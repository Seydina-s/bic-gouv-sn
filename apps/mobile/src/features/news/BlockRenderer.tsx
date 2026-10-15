import type { Block, Cover, Inline } from "@bgs/shared-types";
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, StyleSheet, Text, View, useWindowDimensions, type TextStyle } from "react-native";
import { useProgressive } from "../../components/useProgressive";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { useDataSaver } from "../data-saver/DataSaverProvider";
import { ShowPhotoButton } from "../data-saver/ShowPhotoButton";
import { CoverImage } from "./CoverImage";
import { VideoCard } from "./VideoCard";

/** Formatted text runs (bold, italic, links), inside a parent <Text>. */
export function Runs({ inlines }: { inlines: Inline[] }) {
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
  const { saving } = useDataSaver();
  const [asked, setAsked] = useState(false);
  const { src, alt, media } = block;
  if (media !== undefined) {
    return (
      <CoverImage
        cover={media}
        onDemand
        slotWidth={Math.min(width, theme.layout.readingMaxWidth)}
        label={alt ?? t("article.image")}
        style={[
          styles.image,
          { aspectRatio: media.width / media.height, borderRadius: theme.radius.md },
        ]}
      />
    );
  }
  const frame = [
    styles.image,
    { aspectRatio: ratio, borderRadius: theme.radius.md, backgroundColor: theme.color.surface },
  ];
  if (saving && !asked) {
    // The official file, not our lighter copies: nothing loads until asked for.
    return (
      <View style={frame} accessibilityLabel={alt ?? t("article.image")}>
        <ShowPhotoButton
          onPress={() => {
            setAsked(true);
          }}
        />
      </View>
    );
  }
  return (
    <Image
      source={{ uri: src }}
      accessibilityLabel={alt ?? t("article.image")}
      contentFit="cover"
      transition={theme.motion.duration.normal}
      cachePolicy="memory-disk"
      onLoad={(event) => {
        setRatio(event.source.width / Math.max(event.source.height, 1));
      }}
      style={frame}
    />
  );
}

/** Blocks drawn with the screen: enough to fill it while it slides in. */
export const FIRST_BLOCKS = 6;

/** Renders the API's structured blocks with native components: no web view, no HTML. */
/** `poster`: the article's photo, shown in the preview of its videos. */
export function BlockRenderer({
  blocks,
  poster = null,
}: {
  blocks: Block[];
  poster?: Cover | null;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  const text = { color: color.textPrimary, marginBottom: space.lg };
  // A long text (a Council of Ministers) does not hold the screen back.
  const shown = useProgressive(blocks.length, FIRST_BLOCKS);

  return blocks.slice(0, shown).map((block, index) => {
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
        return <VideoCard key={key} block={block} poster={poster} />;
    }
  });
}

const styles = StyleSheet.create({
  image: { width: "100%" },
  listItem: { flexDirection: "row" },
  flex: { flex: 1 },
});
