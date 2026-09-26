import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { windowClass } from "@bgs/ui";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { BookmarkSimpleIcon as BookmarkSimple } from "phosphor-react-native/src/icons/BookmarkSimple";
import { GearSixIcon as GearSix } from "phosphor-react-native/src/icons/GearSix";
import { MagnifyingGlassIcon as MagnifyingGlass } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { useTabBarInset } from "../../components/GlassTabBar";
import { IconButton } from "../../components/IconButton";
import { ScrollTopButton } from "../../components/ScrollTopButton";
import { ArticlePane } from "../../features/news/ArticlePane";
import { freshnessOf, type Freshness } from "../../features/news/format";
import { COUNCIL_CATEGORY, heroStories, orderSections } from "../../features/news/front-page";
import { HeroCarousel } from "../../features/news/HeroCarousel";
import { Masthead } from "../../features/news/Masthead";
import { SectionFilter } from "../../features/news/SectionFilter";
import { SectionRail } from "../../features/news/SectionRail";
import { CouncilCard } from "../../features/news/Stories";
import { useLastOpened } from "../../features/news/useLastOpened";
import { useFrontSections, useLatestIn, useNewsFeed } from "../../features/news/useNews";
import { WovenIn } from "../../features/news/WovenIn";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/** The "back to top" button appears after this share of a screen has been scrolled. */
const SCROLL_TOP_AFTER = 0.8;

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

/**
 * Home: "La Une" of the official news. The newest pictured stories take turns at
 * the top, the latest Conseil des ministres follows, then one row of cards per
 * section, each ending on its section page. No endless list: stories are reached
 * section by section (user request, 26/09/2026).
 */
export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const freshnessText = (freshness: Freshness): string =>
    freshness.unit === "now"
      ? t("content.updatedJustNow")
      : freshness.unit === "minutes"
        ? t("content.updatedMinutesAgo", { count: freshness.count })
        : freshness.unit === "hours"
          ? t("content.updatedHoursAgo", { count: freshness.count })
          : t("content.updatedDaysAgo", { count: freshness.count });
  const bottomInset = useTabBarInset();
  const router = useRouter();
  const feed = useNewsFeed();
  const council = useLatestIn(COUNCIL_CATEGORY);
  const front = useFrontSections();
  const { lastOpened, markOpened } = useLastOpened();
  const scroller = useRef<ScrollView>(null);
  const [showTop, setShowTop] = useState(false);
  const { color, space, layout } = theme;
  const { width, height } = useWindowDimensions();
  // Tablets and unfolded foldables: front page and article side by side (recomputed live).
  const twoPane = windowClass(width) === "expanded";
  const listPaneWidth = Math.round(
    Math.min(Math.max(width * layout.listPane.share, layout.listPane.min), layout.listPane.max),
  );
  const columnWidth = twoPane
    ? listPaneWidth
    : Math.min(width, layout.readingMaxWidth + space.xxxl);
  const hero = heroStories(feed.data?.pages[0]?.items ?? []);
  const rails = orderSections(front.data?.sections ?? []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shownId = selectedId ?? hero[0]?.id ?? null;
  const hasContent = hero.length > 0 || rails.length > 0;
  const failed = feed.isError || front.isError;

  const open = (id: string) => {
    markOpened(id);
    if (twoPane) {
      setSelectedId(id);
    } else {
      router.push({ pathname: "/article/[id]", params: { id } });
    }
  };
  const openSection = (category: string) => {
    router.push({ pathname: "/section/[slug]", params: { slug: category } });
  };
  const refresh = () => {
    void feed.refetch();
    void council.refetch();
    void front.refetch();
  };

  const masthead = (
    <View>
      <Masthead
        today={new Date()}
        actions={
          <>
            <IconButton
              icon={MagnifyingGlass}
              label={t("search.title")}
              onPress={() => {
                router.push("/search");
              }}
            />
            <IconButton
              icon={BookmarkSimple}
              label={t("favorites.title")}
              onPress={() => {
                router.push("/favorites");
              }}
            />
            <IconButton
              icon={GearSix}
              label={t("settings.title")}
              onPress={() => {
                router.push("/settings");
              }}
            />
          </>
        }
      />
      <SectionFilter
        selected={null}
        onSelect={(category) => {
          if (category !== null) {
            openSection(category);
          }
        }}
      />
      {failed && hasContent && (
        <Notice
          text={`${t("feed.offline")} ${freshnessText(freshnessOf(feed.dataUpdatedAt, feed.errorUpdatedAt))}`}
        />
      )}
    </View>
  );

  const loading = feed.isPending || front.isPending;
  const body = !hasContent ? (
    loading ? (
      <ActivityIndicator
        style={{ marginTop: space.xxl }}
        color={color.primary}
        accessibilityLabel={t("feed.loadMore")}
      />
    ) : failed ? (
      <Notice text={t("feed.error")} action={t("feed.retry")} onAction={refresh} />
    ) : (
      <Notice text={t("feed.empty")} />
    )
  ) : (
    <View style={{ gap: space.xxl }}>
      <WovenIn index={0}>
        <HeroCarousel stories={hero} width={columnWidth} lastOpened={lastOpened} onPress={open} />
      </WovenIn>
      {council.data !== undefined && council.data !== null && (
        <WovenIn index={1}>
          <View style={{ paddingHorizontal: space.lg }}>
            <CouncilCard item={council.data} onPress={open} />
          </View>
        </WovenIn>
      )}
      {rails.map((section, index) => (
        <WovenIn key={section.category} index={index + 2}>
          <SectionRail
            category={section.category}
            items={section.items}
            total={section.total}
            width={columnWidth}
            onOpenStory={open}
            onOpenSection={openSection}
          />
        </WovenIn>
      ))}
    </View>
  );

  const page = (
    <View style={styles.flex}>
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: bottomInset + space.xl }}
        scrollEventThrottle={100}
        onScroll={(event) => {
          const past = event.nativeEvent.contentOffset.y > height * SCROLL_TOP_AFTER;
          if (past !== showTop) {
            setShowTop(past);
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={feed.isRefetching || front.isRefetching}
            onRefresh={refresh}
            tintColor={color.primary}
            colors={[color.primary]}
          />
        }
        testID="news-feed"
      >
        {masthead}
        {body}
      </ScrollView>
      <ScrollTopButton
        visible={showTop}
        bottom={bottomInset + space.sm}
        onPress={() => {
          scroller.current?.scrollTo({ y: 0, animated: true });
        }}
      />
    </View>
  );

  if (twoPane) {
    return (
      <View style={[styles.split, { backgroundColor: color.background }]}>
        <View style={[styles.listPane, { width: listPaneWidth, borderRightColor: color.border }]}>
          {page}
        </View>
        {shownId !== null && (
          <ArticlePane id={shownId} paneWidth={width - listPaneWidth} bottomInset={bottomInset} />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: color.background }]}>
      <View style={[styles.column, { width: columnWidth }]}>{page}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center" },
  column: { flex: 1 },
  flex: { flex: 1 },
  split: { flex: 1, flexDirection: "row" },
  listPane: { borderRightWidth: StyleSheet.hairlineWidth },
  button: { alignSelf: "flex-start", justifyContent: "center" },
});
