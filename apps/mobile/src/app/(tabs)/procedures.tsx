import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { ProcedureSummary } from "@bgs/shared-types";

import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { useDebouncedValue } from "../../features/news/useDebouncedValue";
import { ProcedureRow } from "../../features/procedures/ProcedureRow";
import { ThemeCards } from "../../features/procedures/ThemeCards";
import { useProcedureThemes, useProcedures } from "../../features/procedures/useProcedures";
import { FeatureGate } from "../../features/remote-config/FeatureGate";
import { useTranslation } from "../../i18n/useTranslation";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { FloatingAppBar } from "../../features/shell/FloatingAppBar";
import { useTheme } from "../../theme/useTheme";

/** Pause after typing before the search is sent (fewer requests on slow networks). */
const TYPING_PAUSE_MS = 300;

/**
 * Procedures, search first (GOV.UK): most people arrive knowing what they need.
 * The alphabetical list stays below for those who browse.
 */
function Procedures() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const list = useRef<FlashListRef<ProcedureSummary>>(null);
  const scrollTop = useScrollTop();
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), TYPING_PAUSE_MS);
  const procedures = useProcedures(query);
  const themes = useProcedureThemes();
  const browsing = query === "";
  const hasThemes = (themes.data?.themes ?? []).some((theme) => theme.count > 0);
  // Browsing shows the themes only; the list is for a search (or when themes are missing).
  const showCards = browsing && hasThemes;
  const { color, space, textStyle, radius, touchTarget } = theme;
  const items = procedures.data?.pages.flatMap((page) => page.items) ?? [];
  const total = procedures.data?.pages[0]?.total;

  const header = (
    <View style={{ paddingTop: insets.top + space.xl, paddingHorizontal: space.lg }}>
      <Text accessibilityRole="header" style={[textStyle.headline, { color: color.textPrimary }]}>
        {t("procedures.title")}
      </Text>
      <Text style={[textStyle.body, { color: color.textSecondary, marginTop: space.xs }]}>
        {t("procedures.intro")}
      </Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("procedures.searchPlaceholder")}
        placeholderTextColor={color.textTertiary}
        accessibilityLabel={t("procedures.searchLabel")}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[
          textStyle.body,
          styles.input,
          {
            color: color.textPrimary,
            backgroundColor: color.surface,
            borderColor: color.borderStrong,
            borderRadius: radius.md,
            minHeight: touchTarget.min,
            paddingHorizontal: space.lg,
            marginTop: space.lg,
          },
        ]}
      />
      {showCards ? (
        <View style={{ marginVertical: space.xl }}>
          <ThemeCards
            themes={themes.data?.themes ?? []}
            onOpen={(theme) => {
              router.push({
                pathname: "/procedure-theme/[id]",
                params: { id: theme.id, title: theme.title },
              });
            }}
          />
        </View>
      ) : (
        <Text
          accessibilityLiveRegion="polite"
          style={[textStyle.label, { color: color.textSecondary, marginVertical: space.md }]}
        >
          {total === undefined ? " " : t("procedures.count", { count: total })}
        </Text>
      )}
    </View>
  );

  const empty = procedures.isPending ? (
    <ActivityIndicator color={color.primary} style={{ marginTop: space.xl }} />
  ) : procedures.isError && items.length === 0 ? (
    <View style={{ padding: space.lg, gap: space.md }}>
      <Text style={[textStyle.body, { color: color.textSecondary }]}>{t("procedures.error")}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void procedures.refetch()}
        style={[
          styles.button,
          {
            backgroundColor: color.primary,
            borderRadius: radius.md,
            minHeight: touchTarget.min,
            paddingHorizontal: space.xl,
          },
        ]}
      >
        <Text style={[textStyle.label, { color: color.onPrimary }]}>{t("feed.retry")}</Text>
      </Pressable>
    </View>
  ) : (
    <Text style={[textStyle.body, { color: color.textSecondary, padding: space.lg }]}>
      {t("procedures.noResult", { query })}
    </Text>
  );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <FlashList
        ref={list}
        onScroll={scrollTop.onScroll}
        scrollEventThrottle={100}
        data={showCards ? [] : items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={showCards ? null : empty}
        renderItem={({ item }) => (
          <ProcedureRow
            item={item}
            onPress={(slug) => {
              router.push({ pathname: "/procedure/[slug]", params: { slug } });
            }}
          />
        )}
        onEndReached={() => {
          if (!showCards && procedures.hasNextPage && !procedures.isFetchingNextPage) {
            void procedures.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          procedures.isFetchingNextPage ? (
            <ActivityIndicator
              accessibilityLabel={t("feed.loadMore")}
              color={color.primary}
              style={{ margin: space.lg }}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: bottomInset + space.xl }}
      />
      <ScrollTopButton
        visible={scrollTop.visible}
        bottom={bottomInset + space.sm}
        onPress={() => {
          list.current?.scrollToOffset({ offset: 0, animated: true });
        }}
      />
      <FloatingAppBar visible={scrollTop.visible} top={insets.top} />
    </View>
  );
}

/** Behind the "procedures" kill switch: off, it says so plainly. */
export default function ProceduresScreen() {
  const { t } = useTranslation();
  return (
    <FeatureGate feature="procedures" title={t("tabs.procedures")}>
      <Procedures />
    </FeatureGate>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth },
  button: { alignSelf: "flex-start", alignItems: "center", justifyContent: "center" },
});
