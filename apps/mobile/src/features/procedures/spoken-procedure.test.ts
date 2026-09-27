import type { ProcedurePage } from "./procedure-page";
import { spokenProcedure, type SpokenWords } from "./spoken-procedure";

const words: SpokenWords = {
  brief: "En bref",
  fact: (fact) => `${fact.kind} : ${fact.value}`,
  note: "Remarque",
};

describe("reading a procedure aloud", () => {
  it("reads the page in its own order: title, lead, brief, then each question", () => {
    const page: ProcedurePage = {
      lead: [{ text: "Un résumé." }],
      facts: [{ kind: "cost", value: "Gratuit", section: null }],
      intro: [{ type: "text", inlines: [{ text: "Une introduction." }] }],
      sections: [
        {
          title: "Quelles sont les pièces à fournir ?",
          kind: "documents",
          items: [
            {
              type: "list",
              ordered: false,
              items: [[{ text: "Une photo" }], [{ text: "Un reçu" }]],
            },
            { type: "note", inlines: [{ text: "Originaux exigés." }] },
          ],
        },
      ],
    };
    expect(spokenProcedure("Titre", page, words, 4000)).toEqual([
      "Titre",
      "Un résumé.",
      "En bref",
      "cost : Gratuit",
      "Une introduction.",
      "Quelles sont les pièces à fournir ?",
      "Une photo",
      "Un reçu",
      "Remarque : Originaux exigés.",
    ]);
  });

  it("says nothing of a brief it does not have", () => {
    const page: ProcedurePage = { lead: null, facts: [], intro: [], sections: [] };
    expect(spokenProcedure("Titre", page, words, 4000)).toEqual(["Titre"]);
  });
});
