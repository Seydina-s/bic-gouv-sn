import { describe, expect, it } from "vitest";
import { resolveLang } from "./locale";

describe("resolveLang", () => {
  it("keeps the language chosen at onboarding", () => {
    expect(resolveLang("wo", ["fr-SN"])).toBe("wo");
  });

  it.each([
    [["wo-SN", "fr-FR"], "wo"],
    [["en-US", "fr_SN"], "fr"],
    [["FR-sn"], "fr"],
    [["en-US"], "fr"],
    [[], "fr"],
  ] as const)("device %j → %s", (tags, expected) => {
    expect(resolveLang(null, tags)).toBe(expected);
  });
});
