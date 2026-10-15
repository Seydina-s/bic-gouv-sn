import { useRouter } from "expo-router";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { FunnelSimpleIcon as FunnelSimple } from "phosphor-react-native/src/icons/FunnelSimple";
import { useRef, useState } from "react";
import { ScrollView } from "react-native";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";
import { categoryLabelKey, SECTION_FILTERS } from "./category";
import { FilterSheet } from "./FilterSheet";
import { encodeFilters, NO_FILTERS } from "./filters";
import { SectionChip } from "./SectionChip";

export interface SectionFilterProps {
  /** Selected section slug, or null for every section. */
  selected: string | null;
  onSelect: (category: string | null) => void;
}

/**
 * Row of section chips under the masthead: "Filtrer" first (the panel, FILT-01), one
 * section at a time, or all; then "Institutions", which opens the list of institutions.
 */
export function SectionFilter({ selected, onSelect }: SectionFilterProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { space } = theme;
  const row = useRef<ScrollView>(null);
  const router = useRouter();
  const [filtering, setFiltering] = useState(false);

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
    <>
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
        <SectionChip
          category={null}
          glyph={FunnelSimple}
          label={t("filters.open")}
          active={false}
          onPress={() => {
            setFiltering(true);
          }}
        />
        {chip(null, t("feed.allSections"))}
        <SectionChip
          category={null}
          glyph={Buildings}
          label={t("institutionPages.chip")}
          active={false}
          onPress={() => {
            router.push("/institutions");
          }}
        />
        {SECTION_FILTERS.map((category) => chip(category, t(categoryLabelKey(category))))}
      </ScrollView>
      <FilterSheet
        visible={filtering}
        initial={NO_FILTERS}
        onClose={() => {
          setFiltering(false);
        }}
        onApply={(filters) => {
          setFiltering(false);
          router.push({ pathname: "/filtered", params: { f: encodeFilters(filters) } });
        }}
      />
    </>
  );
}
