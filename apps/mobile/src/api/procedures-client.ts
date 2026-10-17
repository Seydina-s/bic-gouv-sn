import {
  type Lang,
  readProcedureDetail,
  readProcedureList,
  readProcedureThemes,
  type ProcedureDetail,
  type ProcedureListResponse,
  type ProcedureThemesResponse,
} from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";
import { langQuery } from "./news-client";

/** Procedures per numbered page of a theme. */
export const THEME_PAGE_SIZE = 20;

/**
 * Talks to /v1/procedures (procedures explained, linked to e-senegal.sn), in the
 * reader's language when the sheet is translated, in French otherwise (ML-14).
 */
export function createProceduresClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    /** Alphabetical list, or best matches when a query is given; optionally one theme. */
    listProcedures(
      lang: Lang,
      query: string,
      cursor: string | null,
      signal?: AbortSignal,
      theme: string | null = null,
    ): Promise<ProcedureListResponse> {
      const params = new URLSearchParams({ ...langQuery(lang), limit: "30" });
      if (query !== "") {
        params.set("q", query);
      }
      if (theme !== null) {
        params.set("theme", theme);
      }
      if (cursor !== null) {
        params.set("cursor", cursor);
      }
      return getJson(`/v1/procedures?${params.toString()}`, readProcedureList, signal);
    },
    /** One numbered page (from 1) of the procedures filed under a theme. */
    themePage(
      lang: Lang,
      theme: string,
      page: number,
      signal?: AbortSignal,
    ): Promise<ProcedureListResponse> {
      const params = new URLSearchParams({
        ...langQuery(lang),
        limit: String(THEME_PAGE_SIZE),
        theme,
        page: String(page),
      });
      return getJson(`/v1/procedures?${params.toString()}`, readProcedureList, signal);
    },
    /** Official themes with their validated procedures count. */
    listThemes(signal?: AbortSignal): Promise<ProcedureThemesResponse> {
      return getJson("/v1/procedures/themes", readProcedureThemes, signal);
    },
    getProcedure(lang: Lang, slug: string, signal?: AbortSignal): Promise<ProcedureDetail> {
      const params = new URLSearchParams(langQuery(lang));
      return getJson(
        `/v1/procedures/${encodeURIComponent(slug)}?${params.toString()}`,
        readProcedureDetail,
        signal,
      );
    },
  };
}
