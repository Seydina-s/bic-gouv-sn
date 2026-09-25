import type { Block, Inline } from "@bgs/shared-types";
import { Image } from "expo-image";
import { useState } from "react";
import { Linking, StyleSheet, Text, View, type TextStyle } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

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

function ArticleImage({ src, alt }: { src: string; alt: string | null }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [ratio, setRatio] = useState(16 / 9);
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
            <ArticleImage src={block.src} alt={block.alt} />
          </View>
        );
    }
  });
}

const styles = StyleSheet.create({
  image: { width: "100%" },
  listItem: { flexDirection: "row" },
  flex: { flex: 1 },
});
