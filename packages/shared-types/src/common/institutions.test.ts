import { describe, expect, it } from "vitest";
import { compareInstitutions, institutionOfUrl } from "./institutions";
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

describe("compareInstitutions", () => {
  it("puts the Présidence and the Primature first, then the ministries by subject", () => {
    const names = [
      { publisher: "sante", name: "Ministère de la Santé" },
      { publisher: "peches", name: "Ministère des Pêches" },
      { publisher: "primature", name: "Primature" },
      { publisher: "agriculture", name: "Ministère de l'Agriculture" },
      { publisher: "presidence", name: "Présidence" },
    ];
    expect([...names].sort(compareInstitutions).map((item) => item.publisher)).toEqual([
      "presidence",
      "primature",
      "agriculture",
      "peches",
      "sante",
    ]);
  });
});
