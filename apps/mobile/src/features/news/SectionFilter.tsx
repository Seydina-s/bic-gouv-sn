import { useRef } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey, SECTION_FILTERS } from "./category";
import { SectionChip } from "./SectionChip";

export interface SectionFilterProps {
  /** Selected section slug, or null for every section. */
  selected: string | null;
  onSelect: (category: string | null) => void;
}

/** Row of section chips under the masthead: one section at a time, or all. */
export function SectionFilter({ selected, onSelect }: SectionFilterProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { space } = theme;
  const row = useRef<ScrollView>(null);

  const chip = (category: string | null, label: string) => {
    const active = selected === category;
    return (
      <SectionChip
        key={category ?? "all"}
        category={category}
        label={label}
        active={active}
        onPress={() => {
          onSelect(category);
        }}
        onLayout={(event) => {
          // The selected section is brought into view (it may sit past the screen edge).
          if (active) {
            row.current?.scrollTo({ x: Math.max(0, event.nativeEvent.layout.x - space.lg) });
          }
        }}
      />
    );
  };

  return (
    <ScrollView
      ref={row}
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
