import { readOpportunities, type OpportunitiesResponse } from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

/** Talks to /v1/opportunities: what the team published from official portals, still open. */
export function createOpportunitiesClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    listOpportunities(signal?: AbortSignal): Promise<OpportunitiesResponse> {
      return getJson("/v1/opportunities", readOpportunities, signal);
    },
  };
}
