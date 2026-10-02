import { describe, expect, it } from "vitest";
import { foldForMatching } from "./text";

describe("foldForMatching", () => {
  it("drops case and accents, French and Wolof letters alike", () => {
    expect(foldForMatching("Sénégal ÉCOLE Thiès")).toBe("senegal ecole thies");
    expect(foldForMatching("Ñaari jëf ŋ Ŋ à ó")).toBe("naari jef n n a o");
  });

  it("leaves punctuation and spacing as they are", () => {
    expect(foldForMatching("Crédit d'État – 2026 !")).toBe("credit d'etat – 2026 !");
  });
});
