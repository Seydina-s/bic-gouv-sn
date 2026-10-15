import {
  readEntreprendreDetail,
  readEntreprendreOverview,
  type EntreprendreDetail,
  type EntreprendreOverview,
  type EntreprendreSlug,
} from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

/** Talks to /v1/entreprendre: the DER/FJ's offer, read on der.sn (DER-01). */
export function createEntreprendreClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    overview(signal?: AbortSignal): Promise<EntreprendreOverview> {
      return getJson("/v1/entreprendre", readEntreprendreOverview, signal);
    },
    page(slug: EntreprendreSlug, signal?: AbortSignal): Promise<EntreprendreDetail> {
      return getJson(`/v1/entreprendre/${slug}`, readEntreprendreDetail, signal);
    },
  };
}
