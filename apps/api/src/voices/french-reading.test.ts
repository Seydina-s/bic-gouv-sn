import { describe, expect, it } from "vitest";
import type { FrenchLexicon } from "./french-lexicon";
import { lexiconKey, readAloudFrench } from "./french-reading";

// A small lexicon for the tests; the real one is french-lexicon.ts.
const LEXICON: FrenchLexicon = {
  version: 1,
  names: { SALL: { say: "Sal" }, DIAGNE: { phonemes: "djˈaɲ" } },
  capitals: {
    CEDEAO: { say: "Cédéao" },
    FCFA: { say: "francs CFA" },
    PME: { spell: true },
    DE: { say: "de" },
    SENE: { say: "Sène" },
  },
};
const read = (text: string) => readAloudFrench(text, LEXICON);

describe("readAloudFrench", () => {
  it("writes out titles and abbreviations", () => {
    expect(read("S.E.M. Bassirou Diomaye Faye a reçu S.E. l'Ambassadeur.")).toBe(
      "Son Excellence Monsieur Bassirou Diomaye Faye a reçu Son Excellence l'Ambassadeur.",
    );
    expect(read("M. Diop, Mme Fall, Dr Ba, Pr Sy et Me Ndiaye, décret n° 2026-12, etc.")).toBe(
      "Monsieur Diop, Madame Fall, Docteur Ba, Professeur Sy et Maître Ndiaye, décret numéro 2026-12, et cetera",
    );
  });

  it("leaves alone what only looks like an abbreviation", () => {
    expect(read("Il me dit que la Me de la phrase est en minuscule.")).toBe(
      "Il me dit que la Me de la phrase est en minuscule.",
    );
  });

  it("reads the lexicon's words, however a name is written", () => {
    expect(read("La CEDEAO et les PME, 500 FCFA, avec Macky SALL et Ousmane Sall.")).toBe(
      "La Cédéao et les P-M-E, 500 francs CFA, avec Macky Sal et Ousmane Sal.",
    );
    expect(read("Mme Diagne")).toBe("Madame [Diagne](/djˈaɲ/)");
  });

  it("reads titles in capitals as words, with their accents", () => {
    expect(read("CONSEIL DE MINISTRES : M. SENE")).toBe("conseil de ministres : Monsieur Sène");
  });

  it("spells unknown acronyms that cannot be read as words", () => {
    expect(read("La BNDE, la MFPT et l'ONU")).toBe("La B-N-D-E, la M-F-P-T et l'O-N-U");
    expect(read("Le FONGIP")).toBe("Le fongip");
  });

  it("keys the lexicon by the word in capitals without accents", () => {
    expect(lexiconKey("Sène")).toBe("SENE");
    expect(lexiconKey("Cédéao")).toBe("CEDEAO");
  });
});
