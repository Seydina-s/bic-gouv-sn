import { describe, expect, it } from "vitest";
import { interfaceLanguage, resolveLang } from "./locale";

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

describe("interfaceLanguage", () => {
  const reference = { a: "Un", b: { c: "Deux" } };

  it("is the chosen language once its catalog has every word", () => {
    expect(interfaceLanguage("wo", reference, { a: "Benn", b: { c: "Ñaar" } })).toBe("wo");
  });

  it("stays French while the chosen catalog misses words, since they come from French", () => {
    expect(interfaceLanguage("wo", reference, { a: "Benn" })).toBe("fr");
    expect(interfaceLanguage("wo", reference, {})).toBe("fr");
    expect(interfaceLanguage("fr", reference, {})).toBe("fr");
  });
});
