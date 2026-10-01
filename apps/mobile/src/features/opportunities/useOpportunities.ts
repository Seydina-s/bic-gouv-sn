import { useQuery } from "@tanstack/react-query";
import { createOpportunitiesClient } from "../../api/opportunities-client";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createOpportunitiesClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/** The opportunities still open, kept offline like the news. */
export function useOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: ({ signal }) => client.listOpportunities(signal),
  });
}

/** One opportunity of the list (the list is small, and kept offline). */
export function useOpportunity(id: string) {
  const query = useOpportunities();
  return { ...query, opportunity: query.data?.opportunities.find((item) => item.id === id) };
}
