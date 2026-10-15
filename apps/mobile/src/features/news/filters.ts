import { INSTITUTIONS, type Institution } from "@bgs/shared-types";
import { isKnown } from "./category";

/*
 * The "Filtrer" panel (FILT-01, option A chosen by the owner on 15/10/2026): order,
 * period, institutions, sections, and three switches. Kept in the results screen's
 * address, so going back and forth never loses the choice.
 */

export const PERIODS = ["today", "week", "month", "year", "all"] as const;
export type Period = (typeof PERIODS)[number];

export interface NewsFilters {
  order: "newest" | "oldest";
  period: Period;
  publishers: Institution[];
  categories: string[];
  wolof: boolean;
  audio: boolean;
  documents: boolean;
}

export const NO_FILTERS: NewsFilters = {
  order: "newest",
  period: "all",
  publishers: [],
  categories: [],
  wolof: false,
  audio: false,
  documents: false,
};

/** How many choices differ from "everything, newest first". */
export function activeCount(filters: NewsFilters): number {
  return (
    (filters.order === "oldest" ? 1 : 0) +
    (filters.period === "all" ? 0 : 1) +
    filters.publishers.length +
    filters.categories.length +
    [filters.wolof, filters.audio, filters.documents].filter(Boolean).length
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The first day of the period ("2026-10-09"), the day in Dakar (UTC); none for "all". */
export function sinceOf(period: Period, today: Date): string | undefined {
  const day = (date: Date) => date.toISOString().slice(0, 10);
  switch (period) {
    case "today":
      return day(today);
    case "week":
      return day(new Date(today.getTime() - 6 * DAY_MS));
    case "month":
      return day(new Date(today.getTime() - 29 * DAY_MS));
    case "year":
      return `${String(today.getUTCFullYear())}-01-01`;
    case "all":
      return undefined;
  }
}

/** The query /v1/news understands for these filters. */
export function filterParams(filters: NewsFilters, today: Date): Record<string, string> {
  const since = sinceOf(filters.period, today);
  return {
    ...(filters.order === "oldest" ? { order: "oldest" } : {}),
    ...(since === undefined ? {} : { since }),
    ...(filters.publishers.length > 0 ? { publishers: filters.publishers.join(",") } : {}),
    ...(filters.categories.length > 0 ? { categories: filters.categories.join(",") } : {}),
    ...(filters.wolof ? { alsoIn: "wo" } : {}),
    ...(filters.audio ? { audio: "true" } : {}),
    ...(filters.documents ? { documents: "true" } : {}),
  };
}

/** The filters as one short text, for the results screen's address. */
export function encodeFilters(filters: NewsFilters): string {
  return new URLSearchParams({
    o: filters.order,
    p: filters.period,
    i: filters.publishers.join(","),
    r: filters.categories.join(","),
    f: [filters.wolof ? "wo" : "", filters.audio ? "audio" : "", filters.documents ? "pdf" : ""]
      .filter(Boolean)
      .join(","),
  }).toString();
}

const list = (text: string | null) => (text ?? "").split(",").filter((item) => item !== "");

/** Back from the address; anything unknown is left out. */
export function decodeFilters(text: string | undefined): NewsFilters {
  const params = new URLSearchParams(text ?? "");
  const period = params.get("p");
  const switches = list(params.get("f"));
  const institutions: readonly string[] = INSTITUTIONS;
  return {
    order: params.get("o") === "oldest" ? "oldest" : "newest",
    period: PERIODS.find((known) => known === period) ?? "all",
    publishers: list(params.get("i")).filter((id): id is Institution => institutions.includes(id)),
    categories: list(params.get("r")).filter(isKnown),
    wolof: switches.includes("wo"),
    audio: switches.includes("audio"),
    documents: switches.includes("pdf"),
  };
}
