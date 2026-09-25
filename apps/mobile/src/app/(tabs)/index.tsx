import type { NewsSummary } from "@bgs/shared-types";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedHeader } from "../../features/news/FeedHeader";
import { toIsoDay } from "../../features/news/format";
import { NewsBand } from "../../features/news/NewsBand";
import { useLastOpened } from "../../features/news/useLastOpened";
import { useNewsFeed } from "../../features/news/useNews";
import { WovenIn } from "../../features/news/WovenIn";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** Only the first screenful is woven in; later bands appear directly while scrolling. */
const ANIMATED_BANDS = 8;

function Notice({
  text,
  action,
  onAction,
}: {
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  const { theme } = useTheme();
  const { color, space, textStyle } = theme;
  return (
    <View style={{ paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.md }}>
      <Text style={[textStyle.body, { color: color.textSecondary }]}>{text}</Text>
      {action !== undefined && (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[
            styles.button,
            {
              backgroundColor: color.primary,
              borderRadius: theme.radius.md,
              minHeight: theme.touchTarget.min,
              paddingHorizontal: space.xl,
            },
          ]}
        >
          <Text style={[textStyle.label, { color: color.onPrimary }]}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Home: "la pièce du jour", the latest official news woven as bands. */
export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feed = useNewsFeed();
  const { lastOpened, markOpened } = useLastOpened();
  const items = useMemo(() => feed.data?.pages.flatMap((page) => page.items) ?? [], [feed.data]);
  const { color, space } = theme;
  const today = new Date();
  const todayIso = toIsoDay(today);

  const open = (id: string) => {
    markOpened(id);
    router.push({ pathname: "/article/[id]", params: { id } });
  };

  const header = (
    <View style={{ paddingTop: insets.top }}>
      <FeedHeader
        todayCount={items.filter((item) => item.publishedOn === todayIso).length}
        today={today}
      />
      {feed.isError && items.length > 0 && <Notice text={t("feed.offline")} />}
    </View>
  );

  const renderItem = ({ item, index }: { item: NewsSummary; index: number }) => {
    const band = (
      <NewsBand item={item} lead={index === 0} lastOpened={item.id === lastOpened} onPress={open} />
    );
    return index < ANIMATED_BANDS ? <WovenIn index={index}>{band}</WovenIn> : band;
  };

  const empty = feed.isPending ? (
    <ActivityIndicator
      style={{ marginTop: space.xxl }}
      color={color.primary}
      accessibilityLabel={t("feed.loadMore")}
    />
  ) : feed.isError ? (
    <Notice text={t("feed.error")} action={t("feed.retry")} onAction={() => void feed.refetch()} />
  ) : (
    <Notice text={t("feed.empty")} />
  );

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      {/* Wide screens: one centred reading column (two-pane layout: task RESP-01). */}
      <View style={[styles.column, { maxWidth: theme.layout.readingMaxWidth + space.xxxl }]}>
        <FlashList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={empty}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) {
              void feed.fetchNextPage();
            }
          }}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <ActivityIndicator style={{ margin: space.lg }} color={color.primary} />
            ) : null
          }
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => void feed.refetch()}
          testID="news-feed"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  column: { flex: 1, width: "100%" },
  button: { alignSelf: "flex-start", justifyContent: "center" },
});
