import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { useTabBarInset } from "../../components/GlassTabBar";
import { IconButton } from "../../components/IconButton";
import {
  composeFrontPage,
  COUNCIL_CATEGORY,
  type FrontPageRow,
} from "../../features/news/front-page";
import { Masthead } from "../../features/news/Masthead";
import { CouncilCard, LeadStory, StoryRow } from "../../features/news/Stories";
import { useLastOpened } from "../../features/news/useLastOpened";
import { useLatestIn, useNewsFeed } from "../../features/news/useNews";
import { WovenIn } from "../../features/news/WovenIn";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** Only the first screenful is woven in; later stories appear directly while scrolling. */
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

/** Home: "La Une" of the official news, with the woven pagne motifs of each section. */
export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const bottomInset = useTabBarInset();
  const router = useRouter();
  const feed = useNewsFeed();
  const council = useLatestIn(COUNCIL_CATEGORY);
  const { lastOpened, markOpened } = useLastOpened();
  const rows = useMemo(
    () =>
      composeFrontPage(feed.data?.pages.flatMap((page) => page.items) ?? [], council.data ?? null),
    [feed.data, council.data],
  );
  const { color, space } = theme;

  const open = (id: string) => {
    markOpened(id);
    router.push({ pathname: "/article/[id]", params: { id } });
  };

  const header = (
    <View>
      <Masthead
        today={new Date()}
        actions={
          <IconButton
            icon={BookmarkSimple}
            label={t("favorites.title")}
            onPress={() => {
              router.push("/favorites");
            }}
          />
        }
      />
      {feed.isError && rows.length > 0 && <Notice text={t("feed.offline")} />}
    </View>
  );

  const renderItem = ({ item: row, index }: { item: FrontPageRow; index: number }) => {
    const props = { item: row.item, lastOpened: row.item.id === lastOpened, onPress: open };
    const story =
      row.kind === "lead" ? (
        <LeadStory {...props} />
      ) : row.kind === "council" ? (
        <CouncilCard item={row.item} onPress={open} />
      ) : (
        <StoryRow {...props} />
      );
    return index < ANIMATED_BANDS ? <WovenIn index={index}>{story}</WovenIn> : story;
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
          data={rows}
          keyExtractor={(row) => row.item.id}
          getItemType={(row) => row.kind}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: bottomInset }}
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
          onRefresh={() => {
            void feed.refetch();
            void council.refetch();
          }}
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
