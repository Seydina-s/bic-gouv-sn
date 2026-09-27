import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { ProcedureSummary } from "@bgs/shared-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME_PAGE_SIZE } from "../../api/procedures-client";
import { PageBand, usePageMeta } from "../../components/PageBand";
import { PageNavigation } from "../../components/PageNavigation";
import { pageCount } from "../../components/page-slots";
import {
  ScrollTopButton,
  useScrollTop,
  useScrollTopClearance,
} from "../../components/ScrollTopButton";
import { ProcedureRow } from "../../features/procedures/ProcedureRow";
import { ThemeIcon } from "../../features/procedures/ThemeCards";
import { useProcedureThemePage, useProcedureThemes } from "../../features/procedures/useProcedures";
import { FloatingAppBar } from "../../features/shell/FloatingAppBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** A page number from the address; anything else reads as the first page. */
function parsePage(raw: string | undefined): number {
  const page = Number(raw);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * The procedures filed under one theme, 20 per numbered page, under a band in the
 * theme's colours (its icon, its name, how many procedures, which page).
 */
export default function ProcedureThemeScreen() {
  const params = useLocalSearchParams<{ id: string; title?: string; page?: string }>();
  const id = params.id;
  const page = parsePage(params.page);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const list = useRef<FlashListRef<ProcedureSummary>>(null);
  const scrollTop = useScrollTop();
  const clearance = useScrollTopClearance();
  const themes = useProcedureThemes();
  const procedures = useProcedureThemePage(id, page);
  const { color, space, textStyle } = theme;
  const info = themes.data?.themes.find((item) => item.id === id);
  const title = info?.title ?? params.title ?? t("procedures.title");
  const items = procedures.data?.items ?? [];
  const total = procedures.data?.total;
  const pages = total === undefined ? null : pageCount(total, THEME_PAGE_SIZE);
  const meta = usePageMeta(
    total === undefined ? null : t("procedures.count", { count: total }),
    page,
    pages,
  );

  const goTo = (next: number) => {
    router.setParams({ page: String(next) });
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const header = (
    <PageBand
      icon={<ThemeIcon icon={info?.icon ?? null} color={color.onPrimaryContainer} size="lg" />}
      title={title}
      meta={meta}
      background={color.primaryContainer}
      ink={color.onPrimaryContainer}
    />
  );

  const footer =
    items.length === 0 || (pages !== null && pages <= 1) ? null : (
      <PageNavigation
        current={page}
        count={pages}
        hasNext={(procedures.data?.nextCursor ?? null) !== null}
        tone={{ ink: color.textBrand }}
        nextLabel={t("procedures.nextProcedures")}
        onChange={goTo}
      />
    );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          // The band below names the theme: the bar stays empty.
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <FlashList
        ref={list}
        onScroll={scrollTop.onScroll}
        scrollEventThrottle={100}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          procedures.isPending ? (
            <ActivityIndicator color={color.primary} style={{ marginTop: space.xl }} />
          ) : (
            <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
              {procedures.isError ? t("procedures.error") : t("procedures.emptyTheme")}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ProcedureRow
            item={item}
            onPress={(slug) => {
              router.push({ pathname: "/procedure/[slug]", params: { slug } });
            }}
          />
        )}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.lg + clearance }}
        testID="theme-list"
      />
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
  root: { flex: 1 },
});
