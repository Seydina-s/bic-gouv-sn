import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { createNewsClient } from "../../api/news-client";
import { useTranslation } from "../../i18n/useTranslation";
import { useDataSaver } from "../data-saver/DataSaverProvider";

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

/** One numbered page of a section; the previous page stays shown while the next loads. */
export function useSectionPage(category: string, page: number) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, "section", category, page],
    queryFn: ({ signal }) => client.sectionPage(lang, category, page, signal),
    placeholderData: keepPreviousData,
  });
}

/** The newest stories of every section, for the front page rows. */
export function useFrontSections() {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, "sections"],
    queryFn: ({ signal }) => client.sections(lang, signal),
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

/** Search results; waits for at least 2 characters (the API minimum). */
export function useNewsSearch(query: string) {
  const { lang } = useTranslation();
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["news", lang, "search", trimmed],
    queryFn: ({ signal }) => client.searchNews(lang, trimmed, signal),
    enabled: trimmed.length >= MIN_QUERY_LENGTH,
  });
}

export const MIN_QUERY_LENGTH = 2;

export function useNewsArticle(id: string) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["news", lang, id],
    queryFn: ({ signal }) => client.getNews(id, lang, signal),
  });
}

/** Articles of the front page loaded in advance, in order. */
const LIKELY_COUNT = 3;

/**
 * Loads in the background the articles people most often open next (the first
 * stories of the front page), unless data saving is on: then nothing is loaded
 * that was not asked for.
 */
export function usePrefetchLikely(ids: readonly string[]): void {
  const prefetch = usePrefetchArticle();
  const { saving } = useDataSaver();
  const likely = ids.slice(0, LIKELY_COUNT).join(",");
  useEffect(() => {
    if (saving || likely === "") {
      return;
    }
    for (const id of likely.split(",")) {
      prefetch(id);
    }
  }, [likely, saving, prefetch]);
}

/** An article loaded in advance is not fetched again for this long. */
const PREFETCH_FRESH_MS = 60_000;

/**
 * Starts loading an article before it is opened (the finger lands on it, or it is
 * the likely next one): the article screen then shows it at once (CLAUDE.md,
 * navigation: "préchargement de l'écran probable suivant").
 */
export function usePrefetchArticle(): (id: string) => void {
  const { lang } = useTranslation();
  const queryClient = useQueryClient();
  return useCallback(
    (id: string) => {
      queryClient
        .query({
          queryKey: ["news", lang, id],
          queryFn: ({ signal }) => client.getNews(id, lang, signal),
          staleTime: PREFETCH_FRESH_MS,
        })
        // A failed advance load changes nothing: opening the article tries again.
        .catch(() => undefined);
    },
    [lang, queryClient],
  );
}
