import {
  activeCount,
  decodeFilters,
  encodeFilters,
  filterParams,
  NO_FILTERS,
  sinceOf,
  type NewsFilters,
} from "./filters";
import { panelSections } from "./category";

const TODAY = new Date("2026-10-15T10:00:00Z");

describe("the Filtrer panel's choice", () => {
  it("turns a period into its first day", () => {
    expect(sinceOf("today", TODAY)).toBe("2026-10-15");
    expect(sinceOf("week", TODAY)).toBe("2026-10-09");
    expect(sinceOf("month", TODAY)).toBe("2026-09-16");
    expect(sinceOf("year", TODAY)).toBe("2026-01-01");
    expect(sinceOf("all", TODAY)).toBeUndefined();
  });

  it("asks the API only for what was chosen", () => {
    expect(filterParams(NO_FILTERS, TODAY)).toEqual({});
    const chosen: NewsFilters = {
      order: "oldest",
      period: "week",
      publishers: ["presidence", "sante"],
      categories: ["discours"],
      wolof: true,
      audio: true,
      documents: true,
    };
    expect(filterParams(chosen, TODAY)).toEqual({
      order: "oldest",
      since: "2026-10-09",
      publishers: "presidence,sante",
      categories: "discours",
      alsoIn: "wo",
      audio: "true",
      documents: "true",
    });
    expect(activeCount(chosen)).toBe(8);
    expect(activeCount(NO_FILTERS)).toBe(0);
  });

  it("survives the trip through the results screen's address, unknown values left out", () => {
    const chosen: NewsFilters = {
      ...NO_FILTERS,
      period: "month",
      publishers: ["primature"],
      audio: true,
    };
    expect(decodeFilters(encodeFilters(chosen))).toEqual(chosen);
    expect(decodeFilters("o=sideways&p=forever&i=le-soleil,justice&r=x,discours&f=wo,zip")).toEqual(
      {
        ...NO_FILTERS,
        publishers: ["justice"],
        categories: ["discours"],
        wolof: true,
      },
    );
    expect(decodeFilters(undefined)).toEqual(NO_FILTERS);
  });
});

describe("the sections the panel offers", () => {
  it("are those with articles, « Actualités » first, in the panel's order", () => {
    expect(panelSections(["discours", "x", "actualites", "communiques"])).toEqual([
      "actualites",
      "communiques",
      "discours",
    ]);
  });
});
