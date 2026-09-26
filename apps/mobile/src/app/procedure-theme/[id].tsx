import { FlashList, type FlashListRef } from "@shopify/flash-list";
import type { ProcedureSummary } from "@bgs/shared-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { ProcedureRow } from "../../features/procedures/ProcedureRow";
import { useProcedures } from "../../features/procedures/useProcedures";
import { FloatingAppBar } from "../../features/shell/FloatingAppBar";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** The procedures a person has filed under one official theme of e-senegal.sn. */
export default function ProcedureThemeScreen() {
  const { id, title } = useLocalSearchParams<{ id: string; title?: string }>();
  const procedures = useProcedures("", id);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const list = useRef<FlashListRef<ProcedureSummary>>(null);
  const scrollTop = useScrollTop();
  const { color, space, textStyle } = theme;
  const items = procedures.data?.pages.flatMap((page) => page.items) ?? [];
  const total = procedures.data?.pages[0]?.total;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title ?? t("procedures.title"),
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
        ListHeaderComponent={
          total === undefined ? null : (
            <Text
              style={[
                textStyle.label,
                { color: color.textSecondary, padding: space.lg, paddingBottom: space.sm },
              ]}
            >
              {t("procedures.count", { count: total })}
            </Text>
          )
        }
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
        onEndReached={() => {
          if (procedures.hasNextPage && !procedures.isFetchingNextPage) {
            void procedures.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
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
