import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabBarInset } from "../../components/GlassTabBar";
import { useDebouncedValue } from "../../features/news/useDebouncedValue";
import { ProcedureRow } from "../../features/procedures/ProcedureRow";
import { useProcedures } from "../../features/procedures/useProcedures";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** Pause after typing before the search is sent (fewer requests on slow networks). */
const TYPING_PAUSE_MS = 300;

/**
 * Procedures, search first (GOV.UK): most people arrive knowing what they need.
 * The alphabetical list stays below for those who browse.
 */
export default function ProceduresScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useTabBarInset();
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), TYPING_PAUSE_MS);
  const procedures = useProcedures(query);
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
      <Text
        accessibilityLiveRegion="polite"
        style={[textStyle.label, { color: color.textSecondary, marginVertical: space.md }]}
      >
        {total === undefined ? " " : t("procedures.count", { count: total })}
      </Text>
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
        data={items}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth },
  button: { alignSelf: "flex-start", alignItems: "center", justifyContent: "center" },
});
