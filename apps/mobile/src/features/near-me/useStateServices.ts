import { useQuery } from "@tanstack/react-query";
import { createServicesClient } from "../../api/services-client";
import { API_BASE_URL } from "../../api/base-url";

const client = createServicesClient({ baseUrl: API_BASE_URL });

/** Verified state services and towns, kept offline like the news. */
export function useStateServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: ({ signal }) => client.listServices(signal),
  });
}
