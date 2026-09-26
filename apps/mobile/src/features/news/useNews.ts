import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createNewsClient } from "../../api/news-client";
import { useTranslation } from "../../i18n/useTranslation";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createNewsClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/**
 * Latest news in the reader's language, page after page (newest first), for all
 * sections or only one. Each section keeps its own offline cache.
 */
export function useNewsFeed(category: string | null = null) {
  const { lang } = useTranslation();
  return useInfiniteQuery({
    queryKey: ["news", lang, "feed", category ?? "all"],
    queryFn: ({ pageParam, signal }) => client.listNews(lang, pageParam, signal, category),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

/** Newest story of one section (e.g. the latest Conseil des ministres for its card). */
export function useLatestIn(category: string) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, "latest", category],
    queryFn: ({ signal }) => client.latestIn(lang, category, signal),
  });
}

export function useNewsArticle(id: string) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, id],
    queryFn: ({ signal }) => client.getNews(id, lang, signal),
  });
}
