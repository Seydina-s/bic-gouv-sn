import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { ProcedureSummary } from "@bgs/shared-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { THEME_PAGE_SIZE } from "../../api/procedures-client";
import { Pagination } from "../../components/Pagination";
import { pageCount } from "../../components/page-slots";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
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
 * The procedures filed under one theme, 20 per numbered page, under a header in
 * the theme's colours (its icon, its name, how many procedures, which page).
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
  const themes = useProcedureThemes();
  const procedures = useProcedureThemePage(id, page);
  const { color, space, textStyle, radius, touchTarget } = theme;
  const info = themes.data?.themes.find((item) => item.id === id);
  const title = info?.title ?? params.title ?? t("procedures.title");
  const items = procedures.data?.items ?? [];
  const total = procedures.data?.total;
  const count = total === undefined ? null : pageCount(total, THEME_PAGE_SIZE);

  const goTo = (next: number) => {
    router.setParams({ page: String(next) });
    list.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const header = (
    <View
      style={[
        styles.header,
        {
          backgroundColor: color.primaryContainer,
          padding: space.lg,
          paddingVertical: space.xl,
          gap: space.lg,
        },
      ]}
    >
      <View
        style={[
          styles.badge,
          {
            width: touchTarget.min + space.lg,
            height: touchTarget.min + space.lg,
            borderRadius: radius.full,
            backgroundColor: color.background,
          },
        ]}
      >
        <ThemeIcon icon={info?.icon ?? null} color={color.onPrimaryContainer} size="lg" />
      </View>
      <View style={styles.flex}>
        <Text
          accessibilityRole="header"
          style={[textStyle.title, { color: color.onPrimaryContainer }]}
        >
          {title}
        </Text>
        {total !== undefined && (
          <Text
            style={[textStyle.bodySmall, { color: color.onPrimaryContainer, marginTop: space.xxs }]}
          >
            {[
              t("procedures.count", { count: total }),
              count !== null && count > 1
                ? t("section.pageOf", { current: page, total: count })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        )}
      </View>
    </View>
  );

  const footer =
    items.length === 0 || (count !== null && count <= 1) ? null : (
      <View style={{ paddingVertical: space.xl, paddingHorizontal: space.sm }}>
        <Pagination
          current={page}
          count={count}
          hasNext={(procedures.data?.nextCursor ?? null) !== null}
          tone={{ ink: color.textBrand }}
          onChange={goTo}
        />
      </View>
    );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          // The coloured header below already names the theme.
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
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
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
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
  header: { flexDirection: "row", alignItems: "center" },
  badge: { alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
});
