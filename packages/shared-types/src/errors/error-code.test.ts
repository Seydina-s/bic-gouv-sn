import { describe, expect, it } from "vitest";
import { errorCodeOf, errorReportTags } from "./error-code";

describe("errorReportTags", () => {
  it("tags catalogued and unknown codes", () => {
    expect(errorReportTags({ code: "INTERNAL_ERROR" })).toEqual({
      "error.code": "INTERNAL_ERROR",
      "error.catalogued": "true",
    });
    expect(errorReportTags({ code: "NEW_THING" })["error.catalogued"]).toBe("false");
  });

  it("returns no tag without a code", () => {
    expect(errorReportTags(new Error("x"))).toEqual({});
  });
});

describe("errorCodeOf", () => {
  it("reads a catalog-style code", () => {
    expect(errorCodeOf(Object.assign(new Error("x"), { code: "INTERNAL_ERROR" }))).toBe(
      "INTERNAL_ERROR",
    );
  });

  it.each([
    ["no code", new Error("x")],
    ["a Node system code in lowercase", { code: "econnreset" }],
    ["a numeric code", { code: 500 }],
    ["a string", "INTERNAL_ERROR"],
    ["null", null],
  ])("ignores %s", (_label, value) => {
    expect(errorCodeOf(value)).toBeUndefined();
  });
});
