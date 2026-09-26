import { describe, expect, it } from "vitest";
import { normalizeForMatch, proposeTheme, THEME_KEYWORDS } from "./theme-proposals";

const RULES = { transports: ["permis de conduire", "vehicule"], finances: ["pret", "credit"] };

describe("theme proposals", () => {
  it("ignores accents, case and punctuation", () => {
    expect(normalizeForMatch("Crédit d'ÉTAT !")).toBe(" credit d etat ");
  });

  it("proposes the theme whose key words the title and summary carry", () => {
    expect(proposeTheme({ title: "Demander un permis de conduire", summary: null }, RULES)).toBe(
      "transports",
    );
    expect(
      proposeTheme({ title: "Obtenir un prêt", summary: "Un crédit sans intérêt." }, RULES),
    ).toBe("finances");
  });

  it("gives the title more weight than the summary", () => {
    const procedure = { title: "Prêt pour un véhicule", summary: "Permis de conduire exigé." };
    // Title: finances 1 + transports 1 (×2 each); summary: transports 1 → transports wins.
    expect(proposeTheme(procedure, RULES)).toBe("transports");
  });

  it("matches the start of words only", () => {
    expect(proposeTheme({ title: "Demander une interprétation", summary: null }, RULES)).toBeNull();
  });

  it("proposes nothing on a tie or without any key word (left for a person)", () => {
    expect(proposeTheme({ title: "Prêt et véhicule", summary: null }, RULES)).toBeNull();
    expect(proposeTheme({ title: "Demande diverse", summary: null }, RULES)).toBeNull();
  });

  it("covers the 15 official themes", () => {
    expect(Object.keys(THEME_KEYWORDS)).toHaveLength(15);
  });
});
