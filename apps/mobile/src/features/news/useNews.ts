import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createNewsClient } from "../../api/news-client";
import { useTranslation } from "../../i18n/useTranslation";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createNewsClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/** Latest news in the reader's language, page after page (newest first). */
export function useNewsFeed() {
  const { lang } = useTranslation();
  return useInfiniteQuery({
    queryKey: ["news", lang],
    queryFn: ({ pageParam, signal }) => client.listNews(lang, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useNewsArticle(id: string) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, id],
    queryFn: ({ signal }) => client.getNews(id, lang, signal),
  });
}
