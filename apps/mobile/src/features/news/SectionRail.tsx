import type { NewsSummary } from "@bgs/shared-types";
import { ArrowRightIcon as ArrowRight } from "phosphor-react-native/src/icons/ArrowRight";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "../../components/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey } from "./category";
import { CategoryIcon, useCategoryTone } from "./CategoryIcon";
import { CoverImage } from "./CoverImage";
import { useStoryLabel } from "./Stories";

export interface SectionRailProps {
  category: string;
  items: NewsSummary[];
  /** Stories of the section, all pages together. */
  total: number;
  /** Width of the column the rail sits in. */
  width: number;
  onOpenStory: (id: string) => void;
  onOpenSection: (category: string) => void;
}

/** A story as a vertical card: photo (or the section's icon on its tone), title, day. */
function RailCard({
  item,
  width,
  onPress,
}: {
  item: NewsSummary;
  width: number;
  onPress: (id: string) => void;
}) {
  const { theme } = useTheme();
  const tone = useCategoryTone(item.category);
  const { label, day } = useStoryLabel(item);
  const { color, space, textStyle, radius, layout } = theme;
  const photoHeight = width / layout.railCard.photoAspectRatio;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        onPress(item.id);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          borderRadius: radius.lg,
          borderColor: color.border,
          backgroundColor: color.surfaceRaised,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      {item.cover === null ? (
        <View
          style={[
            styles.placeholder,
            { width, height: photoHeight, backgroundColor: tone.container },
          ]}
        >
          <CategoryIcon category={item.category} size="lg" />
        </View>
      ) : (
        <CoverImage cover={item.cover} slotWidth={width} style={{ width, height: photoHeight }} />
      )}
      <View style={{ padding: space.md, gap: space.xs }}>
        <Text style={[textStyle.storyTitle, { color: color.textPrimary }]} numberOfLines={3}>
          {item.title}
        </Text>
        {day !== "" && (
          <Text style={[textStyle.bodySmall, { color: color.textTertiary }]}>{day}</Text>
        )}
      </View>
    </Pressable>
  );
}

/** Last card of a row: leads to the section page. */
function SeeMoreCard({
  category,
  total,
  width,
  onPress,
}: {
  category: string;
  total: number;
  width: number;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const tone = useCategoryTone(category);
  const { space, textStyle, radius } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("section.seeMoreOf", { section: t(categoryLabelKey(category)) })}
      onPress={onPress}
      style={({ pressed }) => [
        styles.seeMore,
        {
          width: width * 0.6,
          borderRadius: radius.lg,
          backgroundColor: tone.container,
          gap: space.sm,
          padding: space.lg,
          opacity: pressed ? theme.opacity.cardPressed : 1,
        },
      ]}
    >
      <CategoryIcon category={category} size="lg" />
      <Text style={[textStyle.subtitle, styles.center, { color: tone.ink }]}>
        {t("section.seeMore")}
      </Text>
      <Text style={[textStyle.bodySmall, styles.center, { color: tone.ink }]}>
        {t("section.count", { count: total })}
      </Text>
      <Icon icon={ArrowRight} color={tone.ink} />
    </Pressable>
  );
}

/**
 * One section on the front page: its name in its tone, then its newest stories as
 * cards side by side, and a last card to see them all.
 */
export function SectionRail({
  category,
  items,
  total,
  width,
  onOpenStory,
  onOpenSection,
}: SectionRailProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const tone = useCategoryTone(category);
  const { space, textStyle, layout } = theme;
  const cardWidth = Math.min(width * layout.railCard.share, layout.railCard.maxWidth);
  const label = t(categoryLabelKey(category));
  const openSection = () => {
    onOpenSection(category);
  };

  return (
    <View style={{ gap: space.md }}>
      <View style={[styles.header, { paddingHorizontal: space.lg, gap: space.sm }]}>
        <CategoryIcon category={category} size="md" />
        <Text
          accessibilityRole="header"
          style={[textStyle.title, styles.flex, { color: tone.ink }]}
        >
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("section.seeMoreOf", { section: label })}
          onPress={openSection}
          hitSlop={space.md}
          style={[styles.header, { minHeight: theme.touchTarget.min, gap: space.xxs }]}
        >
          <Text style={[textStyle.label, { color: tone.ink }]}>{t("section.seeMore")}</Text>
          <Icon icon={ArrowRight} size="sm" color={tone.ink} />
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + space.md}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: space.lg, gap: space.md }}
        renderItem={({ item }) => <RailCard item={item} width={cardWidth} onPress={onOpenStory} />}
        ListFooterComponent={
          <SeeMoreCard category={category} total={total} width={cardWidth} onPress={openSection} />
        }
        testID={`rail-${category}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  card: { overflow: "hidden", borderWidth: StyleSheet.hairlineWidth },
  placeholder: { alignItems: "center", justifyContent: "center" },
  seeMore: { alignItems: "center", justifyContent: "center", alignSelf: "stretch" },
  center: { textAlign: "center" },
});
