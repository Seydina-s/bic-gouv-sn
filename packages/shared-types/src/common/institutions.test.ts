import { describe, expect, it } from "vitest";
import { institutionOfUrl } from "./institutions";
import { officialMediaUrl, officialSourceUrlSchema } from "./official-source.schema";

describe("institutionOfUrl", () => {
  it.each([
    ["https://www.presidence.sn/fr/actualites/x/", "presidence"],
    ["https://primature.sn/publications/actualites/x", "primature"],
    ["https://www.primature.sn/publications/actualites/x", "primature"],
  ])("finds the institution of %s", (url, institution) => {
    expect(institutionOfUrl(url)).toBe(institution);
  });

  it.each(["https://e-senegal.sn/#/home/demarches", "https://primature.sn.evil.test/", "nope"])(
    "finds no institution for %s",
    (url) => {
      expect(institutionOfUrl(url)).toBeNull();
    },
  );
});

describe("Primature as an official source", () => {
  it("accepts its pages and its photos", () => {
    expect(
      officialSourceUrlSchema.safeParse("https://primature.sn/publications/actualites/x").success,
    ).toBe(true);
    expect(officialMediaUrl("https://primature.sn/sites/default/files/2026-10/PM.jpg")).toBe(
      "https://primature.sn/sites/default/files/2026-10/PM.jpg",
    );
  });
});
