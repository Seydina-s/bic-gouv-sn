import { useEffect, useRef } from "react";
import type { NewsDetail } from "@bgs/shared-types";
import { ArrowSquareOutIcon as ArrowSquareOut } from "phosphor-react-native/src/icons/ArrowSquareOut";
import type { ScrollView } from "react-native";
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { NewsApiError } from "../../api/news-client";
import { Icon } from "../../components/Icon";
import { languageProps } from "../../i18n/language";
import { useTranslation } from "../../i18n/useTranslation";
import { ScrollTopButton, useScrollTop } from "../../components/ScrollTopButton";
import { FloatingAppBar } from "../shell/FloatingAppBar";
import { useTheme } from "../../theme/useTheme";
import { useFavorites } from "../favorites/FavoritesProvider";
import { BlockRenderer } from "./BlockRenderer";
import { CoverImage } from "./CoverImage";
import { DocumentList } from "./DocumentList";
import { useRecordRead } from "../usage-stats/UsageStatsProvider";
import { FloatingListenButton, useListenScroll } from "./FloatingListenButton";
import { ListenPill, useArticleListening } from "./ListenButton";
import { formatPublishedOn } from "./format";
import { SectionTag } from "./SectionTag";
import { useNewsArticle } from "./useNews";
import { dimWhenPressed } from "../../components/press-feedback";

const SOURCE = "presidence.sn";

/** HTTP answer of the API for an article the source withdrew (hidden, decision of 28/09). */
const GONE = 410;

export interface ArticleDetailState {
  detail?: NewsDetail;
  isPending: boolean;
  /** The source withdrew it: nothing is shown, not even a saved copy. */
  withdrawn: boolean;
}

/**
 * One article, from the network or, offline, from its saved copy in the favorites.
 * `isPending` is true while nothing can be shown yet.
 */
export function useArticleDetail(id: string): ArticleDetailState {
  const article = useNewsArticle(id);
  const favorites = useFavorites();
  const withdrawn = article.error instanceof NewsApiError && article.error.status === GONE;
  useEffect(() => {
    if (withdrawn) {
      favorites.forget(id);
    }
  }, [withdrawn, favorites, id]);
  if (withdrawn) {
    return { isPending: false, withdrawn };
  }
  const detail = article.data ?? favorites.saved(id);
  return detail === undefined
    ? { isPending: article.isPending, withdrawn }
    : { detail, isPending: false, withdrawn };
}

export interface ArticleViewProps {
  detail: NewsDetail | undefined;
  isPending: boolean;
  /** The source withdrew the article: say so instead of "not available". */
  withdrawn?: boolean;
  /** Width of the area the article is shown in (a full screen or one pane). */
  paneWidth: number;
  /** Space kept free at the bottom (system bars). */
  bottomInset: number;
  /** The app bar slides in on scroll; off in the two-pane layout (the front page has it). */
  withAppBar?: boolean;
  /** False when shown without the person choosing it (the first story beside the list). */
  countsAsRead?: boolean;
}

/** One official article, identical to the source, with its link back to it. */
export function ArticleView({
  detail,
  isPending,
  withdrawn = false,
  paneWidth,
  bottomInset,
  withAppBar = true,
  countsAsRead = true,
}: ArticleViewProps) {
  useRecordRead(countsAsRead ? detail?.id : undefined);
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle } = theme;

  if (detail === undefined) {
    return (
      <View style={[styles.center, { padding: space.xl }]}>
        {isPending ? (
          <ActivityIndicator color={color.primary} />
        ) : (
          <Text style={[textStyle.body, { color: color.textSecondary }]}>
            {t(withdrawn ? "article.withdrawn" : "article.notFound")}
          </Text>
        )}
      </View>
    );
  }
  return (
    <ArticleBody
      key={detail.id}
      detail={detail}
      paneWidth={paneWidth}
      bottomInset={bottomInset}
      withAppBar={withAppBar}
    />
  );
}

/** The article itself, its reading aloud and its floating buttons. */
function ArticleBody({
  detail,
  paneWidth,
  bottomInset,
  withAppBar,
}: {
  detail: NewsDetail;
  paneWidth: number;
  bottomInset: number;
  withAppBar: boolean;
}) {
  const { theme } = useTheme();
  const { t, lang } = useTranslation();
  const scroller = useRef<ScrollView>(null);
  const scrollTop = useScrollTop();
  const listenScroll = useListenScroll(scrollTop.onScroll);
  const listening = useArticleListening(detail);
  const { color, space, textStyle, layout, radius, touchTarget } = theme;

  // Full-bleed photo when the pane is no wider than the reading column, framed otherwise.
  const framed = paneWidth > layout.readingMaxWidth;
  return (
    <View style={styles.scrollRoot}>
      <Animated.ScrollView
        testID="article-scroll"
        ref={scroller}
        onScroll={listenScroll.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingHorizontal: space.lg,
          paddingBottom: bottomInset + space.xxxl,
          alignSelf: "center",
          width: "100%",
          maxWidth: layout.readingMaxWidth,
        }}
      >
        {detail.cover !== null && (
          <View>
            <CoverImage
              cover={detail.cover}
              onDemand
              slotWidth={Math.min(paneWidth, layout.readingMaxWidth)}
              style={{
                aspectRatio: layout.coverAspectRatio,
                // Explicit width: on phones, stretch + negative margins + aspect ratio left
                // a gap on the right (native layout only; the web export looked right).
                width: framed ? "100%" : paneWidth,
                marginLeft: framed ? 0 : -space.lg,
                borderRadius: framed ? radius.md : 0,
                marginBottom: space.lg,
              }}
            />
            {listening.offered && (
              <View
                style={[
                  styles.onPhoto,
                  { right: framed ? space.md : 0, bottom: space.lg + space.md },
                ]}
              >
                <ListenPill listening={listening} />
              </View>
            )}
          </View>
        )}
        <View style={[styles.tagRow, { marginTop: detail.cover === null ? space.md : 0 }]}>
          <SectionTag category={detail.category} />
          {detail.cover === null && <ListenPill listening={listening} />}
        </View>
        <Text
          accessibilityRole="header"
          // The pill sits just above the title: once the title reaches the top, it is gone.
          onLayout={(event) => {
            listenScroll.setAnchor(event.nativeEvent.layout.y);
          }}
          {...languageProps(detail.lang)}
          style={[textStyle.leadHeadline, { color: color.textPrimary, marginTop: space.md }]}
        >
          {detail.title}
        </Text>
        <Text
          style={[
            textStyle.bodySmall,
            { color: color.textTertiary, marginTop: space.sm, marginBottom: space.xl },
          ]}
        >
          {formatPublishedOn(detail.publishedOn, lang)}
          {detail.translationStatus === "machine" ? ` · ${t("content.machineTranslation")}` : ""}
        </Text>
        <View {...languageProps(detail.lang)}>
          <BlockRenderer blocks={detail.blocks} />
        </View>
        <DocumentList documents={detail.documents ?? []} />
        <View
          style={[
            styles.source,
            {
              borderTopColor: color.border,
              paddingTop: space.lg,
              marginTop: space.md,
              gap: space.md,
            },
          ]}
        >
          <Text style={[textStyle.bodySmall, { color: color.textSecondary }]}>
            {t("content.sourceAttribution", { source: SOURCE })}
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => void Linking.openURL(detail.sourceUrl)}
            style={dimWhenPressed(
              [styles.sourceLink, { minHeight: theme.touchTarget.min, gap: space.sm }],
              theme.opacity.controlPressed,
            )}
          >
            <Icon icon={ArrowSquareOut} size="sm" color={color.textBrand} />
            <Text style={[textStyle.label, { color: color.textBrand }]}>
              {t("article.openSource", { source: SOURCE })}
            </Text>
          </Pressable>
        </View>
      </Animated.ScrollView>
      <ScrollTopButton
        visible={scrollTop.visible}
        bottom={bottomInset + space.lg}
        onPress={() => {
          scroller.current?.scrollTo({ y: 0, animated: true });
        }}
      />
      <FloatingListenButton
        listening={listening}
        scroll={listenScroll}
        bottom={bottomInset + space.lg + touchTarget.min + space.md}
      />
      {withAppBar && <FloatingAppBar visible={scrollTop.visible} />}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollRoot: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  source: { borderTopWidth: StyleSheet.hairlineWidth },
  sourceLink: { flexDirection: "row", alignItems: "center" },
  onPhoto: { position: "absolute" },
  tagRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
