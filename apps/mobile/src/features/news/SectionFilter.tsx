import { tracking } from "@bgs/ui";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey, SECTION_FILTERS } from "./category";
import { CategoryIcon } from "./CategoryIcon";

export interface SectionFilterProps {
  /** Selected section slug, or null for every section. */
  selected: string | null;
  onSelect: (category: string | null) => void;
}

/**
 * Row of section chips under the masthead. Each chip carries the icon and tone of
 * its section, so the chips and the stories speak the same visual language.
 */
export function SectionFilter({ selected, onSelect }: SectionFilterProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color, space, textStyle, radius, touchTarget } = theme;

  const chip = (category: string | null, label: string) => {
    const active = selected === category;
    const tone = category === null ? null : theme.categoryTones[category];
    const ink = tone?.ink ?? (active ? color.onPrimaryContainer : color.textSecondary);
    const fill = tone?.container ?? color.primaryContainer;
    return (
      <Pressable
        key={category ?? "all"}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        onPress={() => {
          onSelect(category);
        }}
        style={({ pressed }) => [
          styles.chip,
          {
            minHeight: touchTarget.min,
            gap: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.full,
            borderColor: active ? (tone?.solid ?? fill) : color.border,
            backgroundColor: active ? fill : color.background,
            opacity: pressed ? theme.opacity.cardPressed : 1,
          },
        ]}
      >
        {category !== null && <CategoryIcon category={category} color={ink} />}
        <Text style={[textStyle.caption, styles.caps, { color: ink }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        gap: space.sm,
        paddingHorizontal: space.lg,
        paddingVertical: space.md,
      }}
    >
      {chip(null, t("feed.allSections"))}
      {SECTION_FILTERS.map((category) => chip(category, t(categoryLabelKey(category))))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  caps: { textTransform: "uppercase", letterSpacing: tracking.caps },
});
