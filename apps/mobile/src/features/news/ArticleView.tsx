import type { NewsDetail } from "@bgs/shared-types";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { useFavorites } from "../favorites/FavoritesProvider";
import { BlockRenderer } from "./BlockRenderer";
import { CoverImage } from "./CoverImage";
import { formatPublishedOn } from "./format";
import { SectionTag } from "./SectionTag";
import { useNewsArticle } from "./useNews";

const SOURCE = "presidence.sn";

/**
 * One article, from the network or, offline, from its saved copy in the favorites.
 * `isPending` is true while nothing can be shown yet.
 */
export function useArticleDetail(id: string): { detail?: NewsDetail; isPending: boolean } {
  const article = useNewsArticle(id);
  const favorites = useFavorites();
  const detail = article.data ?? favorites.saved(id);
  return detail === undefined ? { isPending: article.isPending } : { detail, isPending: false };
}

export interface ArticleViewProps {
  detail: NewsDetail | undefined;
  isPending: boolean;
  /** Width of the area the article is shown in (a full screen or one pane). */
  paneWidth: number;
  /** Space kept free at the bottom (system bars). */
  bottomInset: number;
}

/** One official article, identical to the source, with its link back to it. */
export function ArticleView({ detail, isPending, paneWidth, bottomInset }: ArticleViewProps) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const { color, space, textStyle, layout, radius } = theme;

  if (detail === undefined) {
    return (
      <View style={[styles.center, { padding: space.xl }]}>
        {isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t("article.notFound")}
          </Text>
        )}
      </View>
    );
  }

  // Full-bleed photo when the pane is no wider than the reading column, framed otherwise.
  const framed = paneWidth > layout.readingMaxWidth;
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: space.lg,
        paddingBottom: bottomInset + space.xxxl,
        alignSelf: "center",
        width: "100%",
        maxWidth: layout.readingMaxWidth,
      }}
    >
      {detail.cover !== null && (
        <CoverImage
          cover={detail.cover}
          slotWidth={Math.min(paneWidth, layout.readingMaxWidth)}
          style={{
            aspectRatio: layout.coverAspectRatio,
            marginHorizontal: framed ? 0 : -space.lg,
            borderRadius: framed ? radius.md : 0,
            marginBottom: space.lg,
          }}
        />
      )}
      <View style={{ marginTop: detail.cover === null ? space.md : 0 }}>
        <SectionTag category={detail.category} />
      </View>
      <Text
        accessibilityRole="header"
        style={[textStyle.leadHeadline, { color: color.textPrimary, marginTop: space.md }]}
      >
        {detail.title}
      </Text>
      <Text
        style={[
          textStyle.bodySmall,
          { color: color.textTertiary, marginTop: space.sm, marginBottom: space.xl },
        ]}
      >
        {formatPublishedOn(detail.publishedOn, lang)}
        {detail.translationStatus === "machine" ? ` · ${t("content.machineTranslation")}` : ""}
      </Text>
      <BlockRenderer blocks={detail.blocks} />
      <View
        style={[
          styles.source,
          {
            borderTopColor: color.border,
            paddingTop: space.lg,
            marginTop: space.md,
            gap: space.md,
          },
        ]}
      >
        <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
          {t("content.sourceAttribution", { source: SOURCE })}
        </Text>
        <Pressable
          accessibilityRole="link"
          onPress={() => void Linking.openURL(detail.sourceUrl)}
          style={[styles.sourceLink, { minHeight: theme.touchTarget.min, gap: space.sm }]}
        >
          <Icon icon={ArrowSquareOut} size="sm" color={color.textBrand} />
          <Text style={[textStyle.label, { color: color.textBrand }]}>
            {t("article.openSource", { source: SOURCE })}
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  source: { borderTopWidth: StyleSheet.hairlineWidth },
  sourceLink: { flexDirection: "row", alignItems: "center" },
});
