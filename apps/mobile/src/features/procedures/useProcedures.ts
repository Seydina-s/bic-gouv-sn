import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createProceduresClient } from "../../api/procedures-client";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createProceduresClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/**
 * Procedures, alphabetical or matching the query, page after page (kept offline);
 * only one theme's validated procedures when a theme is given.
 */
export function useProcedures(query: string, theme: string | null = null) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["procedures", "list", theme ?? "all", trimmed],
    queryFn: ({ pageParam, signal }) => client.listProcedures(trimmed, pageParam, signal, theme),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
}

export function useProcedure(slug: string) {
  return useQuery({
    queryKey: ["procedures", "detail", slug],
    queryFn: ({ signal }) => client.getProcedure(slug, signal),
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
  return useQuery({
    queryKey: ["procedures", "theme", theme, page],
    queryFn: ({ signal }) => client.themePage(theme, page, signal),
    placeholderData: keepPreviousData,
  });
}
