import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { NewsSummary } from "@bgs/shared-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SECTION_PAGE_SIZE } from "../../api/news-client";
import { PageBand, usePageMeta } from "../../components/PageBand";
import { PageNavigation } from "../../components/PageNavigation";
import { pageCount } from "../../components/page-slots";
import {
  ScrollTopButton,
  useScrollTop,
  useScrollTopClearance,
} from "../../components/ScrollTopButton";
import { categoryLabelKey } from "../../features/news/category";
import { CategoryIcon, useCategoryTone } from "../../features/news/CategoryIcon";
import { SectionFilter } from "../../features/news/SectionFilter";
import { WovenStrip } from "../../features/news/Selvage";
import { LeadStory, StoryRow } from "../../features/news/Stories";
import { useSectionPage } from "../../features/news/useNews";
import { FloatingAppBar } from "../../features/shell/FloatingAppBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** A page number from the address; anything else reads as the first page. */
function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * One section of the news, 20 stories per numbered page: the section chips on top
 * to jump to another section ("Tout" goes back to the front page), a band in the
 * section's colours saying which page this is, the page's first story in large,
 * the others in the list, then a clear way to the next page.
 */
export default function SectionScreen() {
  const params = useLocalSearchParams<{ slug: string; page?: string }>();
  const slug = params.slug;
  const page = parsePage(params.page);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tone = useCategoryTone(slug);
  const list = useRef<FlashListRef<NewsSummary>>(null);
  const section = useSectionPage(slug, page);
  const scrollTop = useScrollTop();
  const clearance = useScrollTopClearance();
  const { color, space, textStyle, layout } = theme;
  const items = section.data?.items ?? [];
  const total = section.data?.total;
  const pages = total === undefined ? null : pageCount(total, SECTION_PAGE_SIZE);
  const label = t(categoryLabelKey(slug));
  const meta = usePageMeta(
    total === undefined ? null : t("section.count", { count: total }),
    page,
    pages,
  );
  const columnWidth = Math.min(width, layout.readingMaxWidth + space.xxxl);

  const goTo = (next: { slug?: string; page: number }) => {
    router.setParams({ slug: next.slug ?? slug, page: String(next.page) });
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };
  const open = (id: string) => {
    router.push({ pathname: "/article/[id]", params: { id } });
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
      <PageBand
        icon={<CategoryIcon category={slug} size="lg" />}
        title={label}
        meta={meta}
        background={tone.container}
        ink={tone.ink}
        strip={<WovenStrip category={slug} color={tone.solid} />}
      />
    </View>
  );

  const footer =
    items.length === 0 || (pages !== null && pages <= 1) ? null : (
      <PageNavigation
        current={page}
        count={pages}
        hasNext={(section.data?.nextCursor ?? null) !== null}
        tone={tone}
        nextLabel={t("section.nextStories")}
        onChange={(next) => {
          goTo({ page: next });
        }}
      />
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
          // The band below names the section: the bar stays empty.
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <View style={[styles.column, { maxWidth: layout.readingMaxWidth + space.xxxl }]}>
        <FlashList
          ref={list}
          onScroll={scrollTop.onScroll}
          scrollEventThrottle={100}
          data={items}
          keyExtractor={(item) => item.id}
          getItemType={(_, index) => (index === 0 ? "lead" : "row")}
          renderItem={({ item, index }) =>
            index === 0 ? (
              <LeadStory
                item={item}
                lastOpened={false}
                showSection={false}
                width={columnWidth}
                onPress={open}
              />
            ) : (
              <StoryRow item={item} lastOpened={false} showSection={false} onPress={open} />
            )
          }
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg + clearance }}
          testID="section-list"
        />
      </View>
      <ScrollTopButton
        visible={scrollTop.visible}
        bottom={insets.bottom + space.lg}
        onPress={() => {
          list.current?.scrollToOffset({ offset: 0, animated: true });
        }}
      />
      <FloatingAppBar visible={scrollTop.visible} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  column: { flex: 1, width: "100%" },
});
