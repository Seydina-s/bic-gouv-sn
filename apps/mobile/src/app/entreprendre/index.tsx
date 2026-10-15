import type { EntreprendreOverview } from "@bgs/shared-types";
import { Stack, useRouter } from "expo-router";
import { CaretRightIcon as CaretRight } from "phosphor-react-native/src/icons/CaretRight";
import { NewspaperIcon as Newspaper } from "phosphor-react-native/src/icons/Newspaper";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/Icon";
import { dimWhenPressed } from "../../components/press-feedback";
import { useContentWidth } from "../../components/useTwoPane";
import { GROUP_ORDER, GROUPS } from "../../features/entreprendre/groups";
import { useEntreprendre } from "../../features/entreprendre/useEntreprendre";
import { formatPublishedOn } from "../../features/news/format";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

type PageItem = EntreprendreOverview["pages"][number];

/** One official page: its title and first words; opened in the space. */
function PageRow({ page }: { page: PageItem }) {
  const { theme } = useTheme();
  const router = useRouter();
  const { color, space, textStyle, touchTarget } = theme;
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        router.push({ pathname: "/entreprendre/[slug]", params: { slug: page.slug } });
      }}
      style={dimWhenPressed(
        [styles.row, { minHeight: touchTarget.min, gap: space.md, paddingVertical: space.md }],
        theme.opacity.cardPressed,
      )}
    >
      <View style={[styles.flex, { gap: space.xxs }]}>
        <Text style={[textStyle.label, { color: color.textPrimary }]}>{page.title}</Text>
        {page.excerpt !== "" && (
          <Text numberOfLines={2} style={[textStyle.bodySmall, { color: color.textSecondary }]}>
            {page.excerpt}
          </Text>
        )}
      </View>
      <Icon icon={CaretRight} size="sm" color={color.textTertiary} />
    </Pressable>
  );
}

/**
 * Entreprendre (DER-01): the DER/FJ's offer as der.sn publishes it, by what the
 * person wants to do (apply, finance, be supported, find a branch), then the
 * DER/FJ itself and its latest news, each opening on der.sn.
 */
export default function EntreprendreScreen() {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const insets = useSafeAreaInsets();
  const width = useContentWidth();
  const { data, isPending } = useEntreprendre();
  const { color, space, textStyle, radius } = theme;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("entreprendre.title"),
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        contentContainerStyle={{
          width,
          alignSelf: "center",
          padding: space.lg,
          paddingBottom: insets.bottom + space.xxxl,
          gap: space.xl,
        }}
      >
        <Text style={[textStyle.body, { color: color.textSecondary }]}>
          {t("entreprendre.intro")}
        </Text>
        {data === undefined || data.pages.length === 0 ? (
          isPending ? (
            <ActivityIndicator color={color.primary} />
          ) : (
            <Text style={[textStyle.body, { color: color.textSecondary }]}>
              {t("entreprendre.empty")}
            </Text>
          )
        ) : (
          GROUP_ORDER.map((group) => {
            const pages = data.pages.filter((page) => page.group === group);
            return pages.length === 0 ? null : (
              <View key={group} style={{ gap: space.xs }}>
                <View style={[styles.row, { gap: space.sm }]}>
                  <View
                    style={{
                      borderRadius: radius.md,
                      padding: space.xs,
                      backgroundColor: color.primaryContainer,
                    }}
                  >
                    <Icon
                      icon={GROUPS[group].icon}
                      size="sm"
                      weight="duotone"
                      color={color.onPrimaryContainer}
                    />
                  </View>
                  <Text
                    accessibilityRole="header"
                    style={[textStyle.title, { color: color.textPrimary }]}
                  >
                    {t(`entreprendre.groups.${group}`)}
                  </Text>
                </View>
                <View
                  style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.border }}
                >
                  {pages.map((page) => (
                    <View
                      key={page.slug}
                      style={{
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderColor: color.border,
                      }}
                    >
                      <PageRow page={page} />
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
        {data !== undefined && data.news.length > 0 && (
          <View style={{ gap: space.sm }}>
            <View style={[styles.row, { gap: space.sm }]}>
              <Icon icon={Newspaper} weight="duotone" color={color.textBrand} />
              <Text
                accessibilityRole="header"
                style={[textStyle.title, { color: color.textPrimary }]}
              >
                {t("entreprendre.newsTitle")}
              </Text>
            </View>
            {data.news.slice(0, 6).map((item) => (
              <Pressable
                key={item.sourceUrl}
                accessibilityRole="link"
                onPress={() => void Linking.openURL(item.sourceUrl)}
                style={dimWhenPressed(
                  [
                    {
                      gap: space.xxs,
                      padding: space.md,
                      borderRadius: radius.md,
                      backgroundColor: color.surface,
                    },
                  ],
                  theme.opacity.cardPressed,
                )}
              >
                <Text style={[textStyle.caption, { color: color.textTertiary }]}>
                  {formatPublishedOn(item.publishedOn, lang)}
                </Text>
                <Text style={[textStyle.label, { color: color.textPrimary }]}>{item.title}</Text>
                {item.excerpt !== "" && (
                  <Text
                    numberOfLines={3}
                    style={[textStyle.bodySmall, { color: color.textSecondary }]}
                  >
                    {item.excerpt}
                  </Text>
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
