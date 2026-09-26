import { FlashList } from "@shopify/flash-list";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { summaryOf } from "../features/favorites/favorites-store";
import { useFavorites } from "../features/favorites/FavoritesProvider";
import { StoryRow } from "../features/news/Stories";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/** Articles kept by the reader, newest first, all readable offline. */
export default function FavoritesScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites } = useFavorites();
  const { color, space, textStyle } = theme;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: t("favorites.title"),
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerTitleStyle: { fontFamily: textStyle.subtitle.fontFamily, color: color.textPrimary },
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
        }}
      />
      <FlashList
        data={favorites}
        keyExtractor={(favorite) => favorite.detail.id}
        renderItem={({ item }) => (
          <StoryRow
            item={summaryOf(item.detail)}
            lastOpened={false}
            onPress={(id) => {
              router.push({ pathname: "/article/[id]", params: { id } });
            }}
          />
        )}
        ListEmptyComponent={
          <Text style={[textStyle.body, { color: color.textSecondary, padding: space.xl }]}>
            {t("favorites.empty")}
          </Text>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
