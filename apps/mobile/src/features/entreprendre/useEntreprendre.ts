import type { EntreprendreSlug } from "@bgs/shared-types";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "../../api/base-url";
import { createEntreprendreClient } from "../../api/entreprendre-client";

const client = createEntreprendreClient({ baseUrl: API_BASE_URL });

/** The DER/FJ's pages and news, kept offline like the news. */
export function useEntreprendre() {
  return useQuery({
    queryKey: ["entreprendre"],
    queryFn: ({ signal }) => client.overview(signal),
  });
}

/** One page of the space, as blocks. */
export function useEntreprendrePage(slug: EntreprendreSlug) {
  return useQuery({
    queryKey: ["entreprendre", slug],
    queryFn: ({ signal }) => client.page(slug, signal),
  });
}
