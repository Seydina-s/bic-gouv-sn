import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StoryRow } from "../features/news/Stories";
import { useDebouncedValue } from "../features/news/useDebouncedValue";
import { MIN_QUERY_LENGTH, useNewsSearch } from "../features/news/useNews";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/** Pause after typing before the search is sent (fewer requests on slow networks). */
const TYPING_PAUSE_MS = 300;

/** Search in the official news, in the reader's language. */
export default function SearchScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState("");
  const query = useDebouncedValue(text.trim(), TYPING_PAUSE_MS);
  const search = useNewsSearch(query);
  const { color, space, textStyle, radius, touchTarget } = theme;
  const items = search.data?.items ?? [];

  const message =
    query.length < MIN_QUERY_LENGTH
      ? t("search.hint")
      : search.isError
        ? t("search.offline")
        : search.isSuccess && items.length === 0
          ? t("search.noResult", { query })
          : null;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("search.title"),
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={t("search.placeholder")}
        placeholderTextColor={color.textTertiary}
        accessibilityLabel={t("search.title")}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        style={[
          textStyle.body,
          {
            color: color.textPrimary,
            backgroundColor: color.surface,
            borderColor: color.borderStrong,
            borderRadius: radius.md,
            minHeight: touchTarget.min,
            paddingHorizontal: space.lg,
            marginHorizontal: space.lg,
            marginVertical: space.md,
          },
          styles.input,
        ]}
      />
      {search.isFetching && query.length >= MIN_QUERY_LENGTH && items.length === 0 ? (
        <ActivityIndicator color={color.primary} style={{ marginTop: space.xl }} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <StoryRow
              item={item}
              lastOpened={false}
              onPress={(id) => {
                router.push({ pathname: "/article/[id]", params: { id } });
              }}
            />
          )}
          ListEmptyComponent={
            message === null ? null : (
              <Text
                accessibilityLiveRegion="polite"
                style={[textStyle.body, { color: color.textSecondary, padding: space.xl }]}
              >
                {message}
              </Text>
            )
          }
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  input: { borderWidth: StyleSheet.hairlineWidth },
});
