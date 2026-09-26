import type { NewsDetail } from "@bgs/shared-types";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { ShareNetworkIcon as ShareNetwork } from "phosphor-react-native/src/icons/ShareNetwork";
import { Share, StyleSheet, View } from "react-native";
import { IconButton } from "../../components/IconButton";
import { useTranslation } from "../../i18n/useTranslation";
import { useFavorites } from "../favorites/FavoritesProvider";

/**
 * Header actions of an article: keep it (readable offline) and share it. Sharing
 * sends the title and the official presidence.sn page, the traceable source.
 */
export function ArticleActions({ detail }: { detail: NewsDetail }) {
  const { t } = useTranslation();
  const favorites = useFavorites();
  const isFavorite = favorites.saved(detail.id) !== undefined;

  return (
    <View style={styles.row}>
      <IconButton
        icon={BookmarkSimple}
        weight={isFavorite ? "fill" : "regular"}
        selected={isFavorite}
        label={isFavorite ? t("favorites.remove") : t("favorites.add")}
        onPress={() => {
          favorites.toggle(detail);
        }}
      />
      <IconButton
        icon={ShareNetwork}
        label={t("article.share")}
        onPress={() =>
          void Share.share({
            title: detail.title,
            message: `${detail.title}\n${detail.sourceUrl}`,
            url: detail.sourceUrl,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
