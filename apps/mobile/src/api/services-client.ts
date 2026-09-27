import { readStateServices, type StateServicesResponse } from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

/**
 * Talks to /v1/services: every verified state service and the towns, in one answer
 * the phone keeps offline. The phone finds the nearest ones itself: no location is
 * ever sent.
 */
export function createServicesClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    listServices(signal?: AbortSignal): Promise<StateServicesResponse> {
      return getJson("/v1/services", readStateServices, signal);
    },
  };
}
