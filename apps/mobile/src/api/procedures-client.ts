import {
  readProcedureDetail,
  readProcedureList,
  type ProcedureDetail,
  type ProcedureListResponse,
} from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

/** Talks to /v1/procedures (procedures explained, linked to e-senegal.sn). */
export function createProceduresClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    /** Alphabetical list, or best matches when a query is given. */
    listProcedures(
      query: string,
      cursor: string | null,
      signal?: AbortSignal,
    ): Promise<ProcedureListResponse> {
      const params = new URLSearchParams({ limit: "30" });
      if (query !== "") {
        params.set("q", query);
      }
      if (cursor !== null) {
        params.set("cursor", cursor);
      }
      return getJson(`/v1/procedures?${params.toString()}`, readProcedureList, signal);
    },
    getProcedure(slug: string, signal?: AbortSignal): Promise<ProcedureDetail> {
      return getJson(`/v1/procedures/${encodeURIComponent(slug)}`, readProcedureDetail, signal);
    },
  };
}
