import { useLocalSearchParams, useRouter } from "expo-router";
import { PageBand, usePageMeta } from "../../components/PageBand";
import { parsePage } from "../../components/page-slots";
import { categoryLabelKey } from "../../features/news/category";
import { CategoryIcon, useCategoryTone } from "../../features/news/CategoryIcon";
import { SectionFilter } from "../../features/news/SectionFilter";
import { WovenStrip } from "../../features/news/Selvage";
import { StoryPages, storyPageCount } from "../../features/news/StoryPages";
import { useStoryPage } from "../../features/news/useNews";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * One section of the news, 20 stories per numbered page: the section chips on top
 * to jump to another section ("Tout" goes back to the front page), a band in the
 * section's colours saying which page this is, then the section's stories.
 */
export default function SectionScreen() {
  const params = useLocalSearchParams<{ slug: string; page?: string }>();
  const slug = params.slug;
  const page = parsePage(params.page);
  const router = useRouter();
  const { t } = useTranslation();
  const tone = useCategoryTone(slug);
  const section = useStoryPage({ category: slug }, page);
  const total = section.data?.total;
  const meta = usePageMeta(
    total === undefined ? null : t("section.count", { count: total }),
    page,
    storyPageCount(section.data),
  );

  const goTo = (next: { slug?: string; page: number }) => {
    router.setParams({ slug: next.slug ?? slug, page: String(next.page) });
  };

  return (
    <StoryPages
      query={section}
      page={page}
      listKey={slug}
      ink={tone.ink}
      emptyText={t("feed.emptySection")}
      showSection={false}
      onPage={(next) => {
        goTo({ page: next });
      }}
      testID="section-list"
      header={
        <>
          <SectionFilter
            selected={slug}
            onSelect={(category) => {
              if (category === null) {
                router.navigate("/");
              } else if (category !== slug) {
                goTo({ slug: category, page: 1 });
              }
            }}
          />
          <PageBand
            icon={<CategoryIcon category={slug} size="lg" />}
            title={t(categoryLabelKey(slug))}
            meta={meta}
            background={tone.container}
            ink={tone.ink}
            strip={<WovenStrip category={slug} color={tone.solid} />}
          />
        </>
      }
    />
  );
}
