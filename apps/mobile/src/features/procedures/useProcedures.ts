import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createProceduresClient } from "../../api/procedures-client";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createProceduresClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/** Procedures, alphabetical or matching the query, page after page (kept offline). */
export function useProcedures(query: string) {
  const trimmed = query.trim();
  return useInfiniteQuery({
    queryKey: ["procedures", "list", trimmed],
    queryFn: ({ pageParam, signal }) => client.listProcedures(trimmed, pageParam, signal),
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
