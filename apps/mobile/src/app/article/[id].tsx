import { Stack, useLocalSearchParams } from "expo-router";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { BlockRenderer } from "../../features/news/BlockRenderer";
import { CoverImage } from "../../features/news/CoverImage";
import { formatPublishedOn } from "../../features/news/format";
import { SectionTag } from "../../features/news/SectionTag";
import { useNewsArticle } from "../../features/news/useNews";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

const SOURCE = "presidence.sn";

/** One official article, identical to the source, with its link back to it. */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = useNewsArticle(id);
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const { color, space, textStyle, layout, radius } = theme;
  const { width: windowWidth } = useWindowDimensions();
  const detail = article.data;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      {detail === undefined ? (
        <View style={[styles.center, { padding: space.xl }]}>
          {article.isPending ? (
            <ActivityIndicator color={color.primary} />
          ) : (
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("article.notFound")}
            </Text>
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: space.lg,
            paddingBottom: insets.bottom + space.xxxl,
            alignSelf: "center",
            width: "100%",
            maxWidth: layout.readingMaxWidth,
          }}
        >
          {detail.cover !== null && (
            // Full-bleed on phones, like the front page; framed in the reading column on wide screens.
            <CoverImage
              cover={detail.cover}
              slotWidth={Math.min(windowWidth, layout.readingMaxWidth)}
              style={{
                aspectRatio: layout.coverAspectRatio,
                marginHorizontal: windowWidth > layout.readingMaxWidth ? 0 : -space.lg,
                borderRadius: windowWidth > layout.readingMaxWidth ? radius.md : 0,
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  source: { borderTopWidth: StyleSheet.hairlineWidth },
  sourceLink: { flexDirection: "row", alignItems: "center" },
});
