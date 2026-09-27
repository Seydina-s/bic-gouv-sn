import { useQuery } from "@tanstack/react-query";
import { createServicesClient } from "../../api/services-client";

// EXPO_PUBLIC_* must be read literally to be inlined at build time.
const client = createServicesClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "" });

/** Verified state services and towns, kept offline like the news. */
export function useStateServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: ({ signal }) => client.listServices(signal),
  });
}
