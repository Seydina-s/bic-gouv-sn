import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createProceduresClient } from "../../api/procedures-client";
import { API_BASE_URL } from "../../api/base-url";
import { useTranslation } from "../../i18n/useTranslation";

const client = createProceduresClient({ baseUrl: API_BASE_URL });

/**
 * Procedures, alphabetical or matching the query, page after page (kept offline);
 * only one theme's validated procedures when a theme is given.
 */
export function useProcedures(query: string, theme: string | null = null) {
  const { lang } = useTranslation();
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["procedures", lang, "list", theme ?? "all", trimmed],
    queryFn: ({ pageParam, signal }) =>
      client.listProcedures(lang, trimmed, pageParam, signal, theme),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useProcedure(slug: string) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["procedures", lang, "detail", slug],
    queryFn: ({ signal }) => client.getProcedure(lang, slug, signal),
  });
}

/** Official themes, with the number of procedures a person has filed under each. */
export function useProcedureThemes() {
  return useQuery({
    queryKey: ["procedures", "themes"],
    queryFn: ({ signal }) => client.listThemes(signal),
  });
}

/** One numbered page of a theme; the previous page stays shown while the next loads. */
export function useProcedureThemePage(theme: string, page: number) {
  const { lang } = useTranslation();
  return useQuery({
    queryKey: ["procedures", lang, "theme", theme, page],
    queryFn: ({ signal }) => client.themePage(lang, theme, page, signal),
    placeholderData: keepPreviousData,
  });
}
