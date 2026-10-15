import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { NewsListResponse, NewsSummary } from "@bgs/shared-types";
import type { UseQueryResult } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, type ReactNode } from "react";
import { ActivityIndicator, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SECTION_PAGE_SIZE } from "../../api/news-client";
import { PageNavigation } from "../../components/PageNavigation";
import { pageCount } from "../../components/page-slots";
import {
  ScrollTopButton,
  useScrollTop,
  useScrollTopClearance,
} from "../../components/ScrollTopButton";
import { FloatingAppBar } from "../shell/FloatingAppBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { LeadStory, StoryRow } from "./Stories";

/** How many pages a paged list has, once its total is known. */
export function storyPageCount(response: NewsListResponse | undefined): number | null {
  return response?.total === undefined ? null : pageCount(response.total, SECTION_PAGE_SIZE);
}

export interface StoryPagesProps {
  /** The page shown (from useStoryPage). */
  query: UseQueryResult<NewsListResponse>;
  page: number;
  /** Changes when the list shown changes (another section): back to the top. */
  listKey: string;
  /** The band naming the list, and what sits above it. */
  header: ReactNode;
  /** Ink of the page buttons: the list's own colour. */
  ink: string;
  /** Said when the list has no story. */
  emptyText: string;
  /** What the band already names, so that no story repeats it. */
  named: "section" | "institution";
  onPage: (page: number) => void;
  testID: string;
}

/**
 * A numbered page of stories (a section's, an institution's), 20 per page: the
 * header band, the page's first story in large, the others in the list, then a
 * clear way to the next page. Every page starts at the top.
 */
export function StoryPages({
  query,
  page,
  listKey,
  header,
  ink,
  emptyText,
  named,
  onPage,
  testID,
}: StoryPagesProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const list = useRef<FlashListRef<NewsSummary>>(null);
  const scrollTop = useScrollTop();
  const clearance = useScrollTopClearance();
  const { color, space, textStyle, layout } = theme;
  const items = query.data?.items ?? [];
  const pages = storyPageCount(query.data);
  const columnWidth = Math.min(width, layout.readingMaxWidth + space.xxxl);

  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: true });
  }, [page, listKey]);

  const open = (id: string) => {
    router.push({ pathname: "/article/[id]", params: { id } });
  };

  const footer =
    items.length === 0 || (pages !== null && pages <= 1) ? null : (
      <PageNavigation
        current={page}
        count={pages}
        hasNext={(query.data?.nextCursor ?? null) !== null}
        tone={{ ink }}
        nextLabel={t("section.nextStories")}
        onChange={onPage}
      />
    );

  const empty = query.isPending ? (
    <ActivityIndicator color={color.primary} style={{ marginTop: space.xxl }} />
  ) : (
    <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
      {query.isError ? t("feed.error") : emptyText}
    </Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          // The band below names the list: the bar stays empty.
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
                showSection={named !== "section"}
                showInstitution={named !== "institution"}
                width={columnWidth}
                onPress={open}
              />
            ) : (
              <StoryRow
                item={item}
                lastOpened={false}
                showSection={named !== "section"}
                showInstitution={named !== "institution"}
                onPress={open}
              />
            )
          }
          ListHeaderComponent={<View>{header}</View>}
          ListFooterComponent={footer}
          ListEmptyComponent={empty}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg + clearance }}
          testID={testID}
        />
      </View>
      <ScrollTopButton
        visible={scrollTop.visible}
        progress={scrollTop.progress}
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
