import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { describeError, ERROR_CATALOG } from "./error-catalog";
import { renderErrorsDoc } from "./errors-doc";

describe("ERROR_CATALOG", () => {
  it.each(Object.entries(ERROR_CATALOG))("%s is fully explained", (code, entry) => {
    expect(code).toMatch(/^[A-Z][A-Z0-9_]*$/);
    for (const text of [entry.what, entry.where, entry.impact, entry.action]) {
      expect(text.trim().length).toBeGreaterThan(3);
    }
  });

  it("keeps each explanation short enough to read in seconds", () => {
    for (const entry of Object.values(ERROR_CATALOG)) {
      expect(entry.what.length).toBeLessThanOrEqual(120);
      expect(entry.action.length).toBeLessThanOrEqual(120);
    }
  });
});

describe("describeError", () => {
  it("explains a catalogued code", () => {
    expect(describeError("INTERNAL_ERROR")).toMatchObject({
      code: "INTERNAL_ERROR",
      catalogued: true,
      severity: "critical",
    });
  });

  it("flags an unknown code instead of hiding it", () => {
    expect(describeError("SOMETHING_NEW")).toMatchObject({
      code: "SOMETHING_NEW",
      catalogued: false,
      severity: "warning",
    });
  });

  it("does not treat inherited object keys as codes", () => {
    expect(describeError("toString").catalogued).toBe(false);
  });
});

describe("docs/errors-catalog.md", () => {
  it("is up to date with the catalog (run `pnpm errors:doc`)", () => {
    const doc = readFileSync(
      new URL("../../../../docs/errors-catalog.md", import.meta.url),
      "utf8",
    );
    expect(doc.replaceAll("\r\n", "\n")).toBe(renderErrorsDoc());
  });

  it("renders one row per code with its severity", () => {
    expect(renderErrorsDoc()).toContain("| `INTERNAL_ERROR` | 🔴 Rouge |");
  });
});
