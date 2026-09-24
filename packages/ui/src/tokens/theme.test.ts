import { describe, expect, it } from "vitest";
import { toCssVariables } from "./css-variables";
import { resolveColorScheme, themes } from "./theme";

describe("resolveColorScheme", () => {
  it.each([
    ["system", "dark", "dark"],
    ["system", "light", "light"],
    ["system", null, "light"],
    ["system", "unspecified", "light"],
    ["light", "dark", "light"],
    ["dark", "light", "dark"],
  ] as const)("preference %s with system %s gives %s", (preference, system, expected) => {
    expect(resolveColorScheme(preference, system)).toBe(expected);
  });
});

describe("themes", () => {
  it("share the same scales and differ only by colors", () => {
    expect(themes.dark.space).toBe(themes.light.space);
    expect(themes.dark.font).toBe(themes.light.font);
    expect(themes.dark.color).not.toEqual(themes.light.color);
  });

  it("define the same color tokens in both schemes", () => {
    expect(Object.keys(themes.dark.color).sort()).toEqual(Object.keys(themes.light.color).sort());
  });
});

describe("toCssVariables", () => {
  const variables = toCssVariables(themes.light);

  it("uses the --bgs-{category}-{name} convention", () => {
    expect(variables["--bgs-color-primary"]).toBe("#00853F");
    expect(variables["--bgs-color-text-primary"]).toBe(themes.light.color.textPrimary);
  });

  it("converts numeric scales to pixels", () => {
    expect(variables["--bgs-space-md"]).toBe("12px");
    expect(variables["--bgs-radius-full"]).toBe("999px");
  });
});
