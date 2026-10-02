import { describe, expect, it } from "vitest";
import { frenchStem } from "./french-stem";

describe("frenchStem", () => {
  it("brings verbs, nouns, plurals and feminine forms to one stem", () => {
    expect(frenchStem("divorcer")).toBe(frenchStem("divorce"));
    expect(frenchStem("coute")).toBe(frenchStem("cout"));
    expect(frenchStem("pieces")).toBe(frenchStem("piece"));
    expect(frenchStem("militaires")).toBe(frenchStem("militaire"));
    expect(frenchStem("journaux")).toBe("journau");
  });

  it("leaves short words and numbers as they are", () => {
    expect(frenchStem("les")).toBe("les");
    expect(frenchStem("mer")).toBe("mer");
    expect(frenchStem("2026")).toBe("2026");
    expect(frenchStem("bsc1")).toBe("bsc1");
  });

  it("keeps a stem long enough to mean something", () => {
    expect(frenchStem("cher")).toBe("cher");
    expect(frenchStem("acte")).toBe("acte");
    expect(frenchStem("passer")).toBe(frenchStem("passe"));
    expect(frenchStem("demander")).toBe("demand");
  });
});
