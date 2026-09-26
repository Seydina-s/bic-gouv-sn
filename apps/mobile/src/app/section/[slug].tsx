import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { NewsSummary } from "@bgs/shared-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SECTION_PAGE_SIZE } from "../../api/news-client";
import { categoryLabelKey } from "../../features/news/category";
import { CategoryIcon, useCategoryTone } from "../../features/news/CategoryIcon";
import { Pagination } from "../../features/news/Pagination";
import { pageCount } from "../../features/news/page-slots";
import { SectionFilter } from "../../features/news/SectionFilter";
import { StoryRow } from "../../features/news/Stories";
import { useSectionPage } from "../../features/news/useNews";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** A page number from the address; anything else reads as the first page. */
function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * One section of the news, 20 stories per numbered page. The section chips stay on
 * top to jump to another section; "Tout" goes back to the front page.
 */
export default function SectionScreen() {
  const params = useLocalSearchParams<{ slug: string; page?: string }>();
  const slug = params.slug;
  const page = parsePage(params.page);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tone = useCategoryTone(slug);
  const list = useRef<FlashListRef<NewsSummary>>(null);
  const section = useSectionPage(slug, page);
  const { color, space, textStyle, layout } = theme;
  const items = section.data?.items ?? [];
  const total = section.data?.total;
  const label = t(categoryLabelKey(slug));

  const goTo = (next: { slug?: string; page: number }) => {
    router.setParams({ slug: next.slug ?? slug, page: String(next.page) });
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const header = (
    <View>
      <SectionFilter
        selected={slug}
        onSelect={(category) => {
          if (category === null) {
            router.navigate("/");
          } else if (category !== slug) {
            goTo({ slug: category, page: 1 });
          }
        }}
      />
      <View
        style={[
          styles.title,
          {
            backgroundColor: tone.container,
            paddingHorizontal: space.lg,
            paddingVertical: space.lg,
            gap: space.md,
          },
        ]}
      >
        <CategoryIcon category={slug} size="lg" />
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[textStyle.title, { color: tone.ink }]}>
            {label}
          </Text>
          {total !== undefined && (
            <Text style={[textStyle.bodySmall, { color: tone.ink }]}>
              {t("section.count", { count: total })}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const footer =
    items.length === 0 ? null : (
      <View style={{ paddingVertical: space.xl, paddingHorizontal: space.sm }}>
        <Pagination
          current={page}
          count={total === undefined ? null : pageCount(total, SECTION_PAGE_SIZE)}
          hasNext={(section.data?.nextCursor ?? null) !== null}
          tone={tone}
          onChange={(next) => {
            goTo({ page: next });
          }}
        />
      </View>
    );

  const empty = section.isPending ? (
    <ActivityIndicator color={color.primary} style={{ marginTop: space.xxl }} />
  ) : (
    <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
      {section.isError ? t("feed.error") : t("feed.emptySection")}
    </Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: label,
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.column, { maxWidth: layout.readingMaxWidth + space.xxxl }]}>
        <FlashList
          ref={list}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <StoryRow
              item={item}
              lastOpened={false}
              showSection={false}
              onPress={(id) => {
                router.push({ pathname: "/article/[id]", params: { id } });
              }}
            />
          )}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
          testID="section-list"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  column: { flex: 1, width: "100%" },
  title: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
});
