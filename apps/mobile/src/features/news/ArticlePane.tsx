import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { ArticleActions } from "./ArticleActions";
import { ArticleView, useArticleDetail } from "./ArticleView";

export interface ArticlePaneProps {
  id: string;
  paneWidth: number;
  bottomInset: number;
}

/** Detail pane of the two-pane layout: the article with its actions on top. */
export function ArticlePane({ id, paneWidth, bottomInset }: ArticlePaneProps) {
  const { theme } = useTheme();
  const { detail, isPending } = useArticleDetail(id);
  const { space } = theme;
  return (
    <View style={styles.root}>
      <View style={[styles.actions, { paddingHorizontal: space.sm, paddingTop: space.sm }]}>
        {detail !== undefined && <ArticleActions detail={detail} />}
      </View>
      <ArticleView
        detail={detail}
        isPending={isPending}
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
