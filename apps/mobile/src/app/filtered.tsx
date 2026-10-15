import { useLocalSearchParams, useRouter } from "expo-router";
import { FunnelSimpleIcon as FunnelSimple } from "phosphor-react-native/src/icons/FunnelSimple";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Icon } from "../components/Icon";
import { PageBand, usePageMeta } from "../components/PageBand";
import { parsePage } from "../components/page-slots";
import { FilterSheet } from "../features/news/FilterSheet";
import { decodeFilters, encodeFilters, filterParams } from "../features/news/filters";
import { StoryPages, storyPageCount } from "../features/news/StoryPages";
import { useStoryPage } from "../features/news/useNews";
import { useTranslation } from "../i18n/useTranslation";
import { useTheme } from "../theme/useTheme";

/**
 * The articles the "Filtrer" panel chose (FILT-01), 20 per numbered page; the
 * choice lives in the address (`f`), and "Modifier les filtres" reopens the panel.
 */
export default function FilteredScreen() {
  const params = useLocalSearchParams<{ f?: string; page?: string }>();
  const filters = decodeFilters(params.f);
  const page = parsePage(params.page);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const { color, space, textStyle, touchTarget } = theme;
  const stories = useStoryPage({ params: filterParams(filters, new Date()) }, page);
  const total = stories.data?.total;
  const meta = usePageMeta(
    total === undefined ? null : t("institutionPages.count", { count: total }),
    page,
    storyPageCount(stories.data),
  );

  return (
    <>
      <StoryPages
        query={stories}
        page={page}
        listKey={params.f ?? ""}
        ink={color.textBrand}
        emptyText={t("filters.resultsEmpty")}
        named="none"
        onPage={(next) => {
          router.setParams({ page: String(next) });
        }}
        testID="filtered-list"
        header={
          <>
            <PageBand
              icon={
                <Icon
                  icon={FunnelSimple}
                  size="lg"
                  weight="duotone"
                  color={color.onPrimaryContainer}
                />
              }
              title={t("filters.resultsTitle")}
              meta={meta}
              background={color.primaryContainer}
              ink={color.onPrimaryContainer}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditing(true);
              }}
              style={{
                minHeight: touchTarget.min,
                justifyContent: "center",
                paddingHorizontal: space.lg,
              }}
            >
              <Text style={[textStyle.label, { color: color.textBrand }]}>{t("filters.edit")}</Text>
            </Pressable>
          </>
        }
      />
      <FilterSheet
        visible={editing}
        initial={filters}
        onClose={() => {
          setEditing(false);
        }}
        onApply={(next) => {
          setEditing(false);
          router.setParams({ f: encodeFilters(next), page: "1" });
        }}
      />
    </>
  );
}
