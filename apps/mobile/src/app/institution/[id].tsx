import { useLocalSearchParams, useRouter } from "expo-router";
import { BuildingsIcon as Buildings } from "phosphor-react-native/src/icons/Buildings";
import { Icon } from "../../components/Icon";
import { PageBand, usePageMeta } from "../../components/PageBand";
import { parsePage } from "../../components/page-slots";
import { institutionLabelKey } from "../../features/news/institution";
import { StoryPages, storyPageCount } from "../../features/news/StoryPages";
import { useStoryPage } from "../../features/news/useNews";
import { useTranslation } from "../../i18n/useTranslation";
import { useTheme } from "../../theme/useTheme";

/**
 * One institution's news (the Primature, a ministry), 20 stories per numbered page,
 * every section together: the stories it published, and those the Présidence also
 * published for it (shown once, in the Présidence's version).
 */
export default function InstitutionScreen() {
  const params = useLocalSearchParams<{ id: string; page?: string }>();
  const id = params.id;
  const page = parsePage(params.page);
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { color } = theme;
  const stories = useStoryPage({ publisher: id }, page);
  const total = stories.data?.total;
  const meta = usePageMeta(
    total === undefined ? null : t("institutionPages.count", { count: total }),
    page,
    storyPageCount(stories.data),
  );
  const key = institutionLabelKey(id);

  return (
    <StoryPages
      query={stories}
      page={page}
      listKey={id}
      ink={color.textBrand}
      emptyText={t("institutionPages.empty")}
      showSection
      onPage={(next) => {
        router.setParams({ page: String(next) });
      }}
      testID="institution-list"
      header={
        <PageBand
          icon={
            <Icon icon={Buildings} size="lg" weight="duotone" color={color.onPrimaryContainer} />
          }
          title={key === null ? t("institutionPages.title") : t(key)}
          meta={meta}
          background={color.primaryContainer}
          ink={color.onPrimaryContainer}
        />
      }
    />
  );
}
