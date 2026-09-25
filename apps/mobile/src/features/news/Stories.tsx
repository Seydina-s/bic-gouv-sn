import type { NewsSummary } from "@bgs/shared-types";
import { ArrowRightIcon as ArrowRight } from "phosphor-react-native/src/icons/ArrowRight";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey } from "./category";
import { CoverImage } from "./CoverImage";
import { formatPublishedOn } from "./format";
import { SectionTag } from "./SectionTag";
import { Selvage, SELVAGE_WIDTH, WovenStrip } from "./Selvage";

const SOURCE = "presidence.sn";
/** Wider than the feed thumbnails of the woven direction: photos carry "La Une". */
const THUMB_WIDTH = 92;
const THUMB_HEIGHT = 72;
const LEAD_ASPECT_RATIO = 16 / 10;

export interface StoryProps {
  item: NewsSummary;
  lastOpened: boolean;
  onPress: (id: string) => void;
}

/** What a screen reader announces for one story: section, title, day. */
function useStoryLabel(item: NewsSummary): { label: string; day: string } {
  const { t, lang } = useTranslation();
  const day = formatPublishedOn(item.publishedOn, lang);
  const label = [t(categoryLabelKey(item.category)), item.title, day].filter(Boolean).join(". ");
  return { label, day };
}

/** The lead story: full-bleed photo, newspaper headline, opening words, source. */
export function LeadStory({ item, lastOpened, onPress }: StoryProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { label, day } = useStoryLabel(item);
  const { color, space, textStyle, layout } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => ({ backgroundColor: pressed ? color.surface : color.background })}
    >
      {item.cover !== null && (
        <CoverImage
          cover={item.cover}
          slotWidth={Math.min(width, layout.readingMaxWidth + space.xxxl)}
          style={{ aspectRatio: LEAD_ASPECT_RATIO }}
        />
      )}
      <View style={{ padding: space.lg, gap: space.sm }}>
        <SectionTag category={item.category} lastOpened={lastOpened} />
        <Text style={[textStyle.leadHeadline, { color: color.textPrimary }]} numberOfLines={5}>
          {item.title}
        </Text>
        {item.excerpt !== "" && (
          <Text style={[textStyle.body, { color: color.textSecondary }]} numberOfLines={3}>
            {item.excerpt}
          </Text>
        )}
        <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>
          {[day, SOURCE].filter(Boolean).join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

/** Highlighted card for the latest Conseil des ministres, woven with its chevrons. */
export function CouncilCard({ item, onPress }: Omit<StoryProps, "lastOpened">) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { label, day } = useStoryLabel(item);
  const { color, space, textStyle, radius } = theme;
  const ink = color.onPrimaryContainer;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("feed.latestCouncil")}. ${label}`}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          marginHorizontal: space.lg,
          marginVertical: space.md,
          borderRadius: radius.lg,
          backgroundColor: color.primaryContainer,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <WovenStrip category={item.category} color={ink} />
      <View style={{ padding: space.lg, gap: space.sm }}>
        <Text style={[textStyle.caption, styles.caps, { color: ink }]}>
          {t("feed.latestCouncil")}
        </Text>
        <Text style={[textStyle.storyTitle, { color: ink }]} numberOfLines={4}>
          {item.title}
        </Text>
        {day !== "" && <Text style={[textStyle.bodySmall, { color: ink }]}>{day}</Text>}
        <View style={[styles.action, { gap: space.xs, marginTop: space.xs }]}>
          <Text style={[textStyle.label, { color: ink }]}>{t("feed.readCommunique")}</Text>
          <Icon icon={ArrowRight} size="sm" color={ink} />
        </View>
      </View>
    </Pressable>
  );
}

/** One story in the list: woven selvage, section, serif title, day, photo on the right. */
export function StoryRow({ item, lastOpened, onPress }: StoryProps) {
  const { theme } = useTheme();
  const { label, day } = useStoryLabel(item);
  const { color, space, textStyle, radius } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => [
        styles.row,
        {
          borderTopColor: color.border,
          backgroundColor: pressed ? color.surface : color.background,
          paddingVertical: space.lg,
          paddingRight: space.lg,
          minHeight: theme.touchTarget.min,
        },
      ]}
    >
      <Selvage category={item.category} color={color.primary} />
      <View style={[styles.body, { marginLeft: space.lg - SELVAGE_WIDTH, gap: space.xs }]}>
        <SectionTag category={item.category} lastOpened={lastOpened} />
        <Text style={[textStyle.storyTitle, { color: color.textPrimary }]} numberOfLines={3}>
          {item.title}
        </Text>
        {day !== "" && (
          <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>{day}</Text>
        )}
      </View>
      {item.cover !== null && (
        <CoverImage
          cover={item.cover}
          slotWidth={THUMB_WIDTH}
          style={{
            width: THUMB_WIDTH,
            height: THUMB_HEIGHT,
            borderRadius: radius.md,
            marginLeft: space.md,
          }}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  caps: { textTransform: "uppercase", letterSpacing: 0.8 },
  action: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth },
  body: { flex: 1 },
});
