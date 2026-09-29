import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { ArticleActions } from "./ArticleActions";
import { ArticleView, useArticleDetail } from "./ArticleView";

export interface ArticlePaneProps {
  id: string;
  paneWidth: number;
  bottomInset: number;
  /** False for the story shown by default, before the person chose one. */
  chosen: boolean;
}

/** Detail pane of the two-pane layout: the article with its actions on top. */
export function ArticlePane({ id, paneWidth, bottomInset, chosen }: ArticlePaneProps) {
  const { theme } = useTheme();
  const { detail, isPending, withdrawn } = useArticleDetail(id);
  const { space } = theme;
  return (
    <View style={styles.root}>
      <View style={[styles.actions, { paddingHorizontal: space.sm, paddingTop: space.sm }]}>
        {detail !== undefined && <ArticleActions detail={detail} />}
      </View>
      <ArticleView
        withAppBar={false}
        countsAsRead={chosen}
        detail={detail}
        isPending={isPending}
        withdrawn={withdrawn}
        paneWidth={paneWidth}
        bottomInset={bottomInset}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end" },
});
