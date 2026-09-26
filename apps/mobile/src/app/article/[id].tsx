import { Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArticleActions } from "../../features/news/ArticleActions";
import { ArticleView, useArticleDetail } from "../../features/news/ArticleView";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * One official article on its own screen (phones), with its actions in the header:
 * keep it in the favorites (readable offline) and share it.
 */
export default function ArticleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, isPending } = useArticleDetail(id);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { color } = theme;

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "",
          headerBackTitle: t("article.back"),
          headerTintColor: color.textBrand,
          headerStyle: { backgroundColor: color.background },
          headerShadowVisible: false,
          headerRight: () => (detail === undefined ? null : <ArticleActions detail={detail} />),
        }}
      />
      <ArticleView
        detail={detail}
        isPending={isPending}
        paneWidth={width}
        bottomInset={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
