import type { Block, ProcedureDetail } from "@bgs/shared-types";
import { PROCEDURE_DETAIL } from "../../testing/procedure-fixtures";
import { procedurePage, type PageWords } from "./procedure-page";

const words: PageWords = {
  eligibility: "Qui peut faire la démarche ?",
  documents: "Pièces à fournir",
  fee: (amount) => (amount === 0 ? "Gratuit" : `${String(amount)} F CFA`),
  delay: (days) => `${String(days)} jours`,
  pieces: (count) => `${String(count)} pièces`,
  online: "Possible",
};

const p = (text: string): Block => ({ type: "paragraph", inlines: [{ text }] });

function detail(overrides: Partial<ProcedureDetail>): ProcedureDetail {
  return {
    ...PROCEDURE_DETAIL,
    summary: null,
    costFcfa: null,
    delayDays: null,
    online: false,
    eligibility: null,
    documents: [],
    blocks: [],
    ...overrides,
  };
}

describe("arranging the page of a procedure", () => {
  it("lifts short answers into the brief, word for word, and drops their sections", () => {
    const page = procedurePage(
      detail({
        blocks: [
          p("Qui peut faire la demande ?"),
          p("Tout citoyen sénégalais."),
          p("Quel est le coût ?"),
          p("Gratuit"),
          p("Où s'adresser ?"),
          p("Au commissariat de police."),
          p("Comment faire ?"),
          p("Se présenter au guichet avec les pièces."),
        ],
      }),
      words,
    );
    expect(page.facts).toEqual([
      { kind: "who", value: "Tout citoyen sénégalais.", section: null },
      { kind: "cost", value: "Gratuit", section: null },
      { kind: "where", value: "Au commissariat de police.", section: null },
    ]);
    expect(page.sections.map((section) => section.kind)).toEqual(["how"]);
  });

  it("keeps a long answer in its section and shows the figure the source gives", () => {
    const long = `Le coût dépend ${"de la puissance installée, ".repeat(4)}selon le barème.`;
    const page = procedurePage(
      detail({
        costFcfa: 5000,
        delayDays: 2,
        online: true,
        blocks: [p("Quel est le coût ?"), p(long)],
      }),
      words,
    );
    expect(page.facts).toEqual([
      { kind: "cost", value: "5000 F CFA", section: null },
      { kind: "time", value: "2 jours", section: null },
      { kind: "online", value: "Possible", section: null },
    ]);
    expect(page.sections.map((section) => section.kind)).toEqual(["cost"]);
  });

  it("lets only the first section of a kind speak for it", () => {
    const page = procedurePage(
      detail({
        blocks: [
          p("Quel est le coût ?"),
          p("Il dépend du dossier :"),
          p("• 1 000 F pour un dossier simple ;"),
          p("• 2 000 F pour un dossier double."),
          p("Quels sont les frais de timbre ?"),
          p("500 F"),
        ],
      }),
      words,
    );
    expect(page.facts).toEqual([]);
    expect(page.sections).toHaveLength(2);
  });

  it("never lifts the unfinished start of an answer", () => {
    const page = procedurePage(
      detail({ blocks: [p("Qui peut faire la demande ?"), p("Tout Sénégalais né au Sénégal,")] }),
      words,
    );
    expect(page.facts).toEqual([]);
    expect(page.sections).toHaveLength(1);
  });

  it("never lifts an answer holding a link", () => {
    const page = procedurePage(
      detail({
        blocks: [
          p("Où s'adresser ?"),
          {
            type: "paragraph",
            inlines: [{ text: "Sur le site du ministère", href: "https://www.example.org" }],
          },
        ],
      }),
      words,
    );
    expect(page.facts).toEqual([]);
    expect(page.sections).toHaveLength(1);
  });

  it("counts the documents to bring and leads to their list", () => {
    const page = procedurePage(
      detail({
        blocks: [
          p("Comment faire ?"),
          p("Déposer le dossier complet au guichet, puis attendre la convocation."),
          p("Quelles sont les pièces à fournir ?"),
          p("• Une demande manuscrite"),
          p("• Un extrait de naissance"),
        ],
      }),
      words,
    );
    expect(page.facts).toEqual([{ kind: "documents", value: "2 pièces", section: 1 }]);
  });

  it("adds the structured public and documents the sheet does not cover", () => {
    const page = procedurePage(
      detail({
        eligibility: "Public de test.",
        documents: ["Une photo d'identité"],
        blocks: [p("Où s'adresser ?"), p("À la préfecture du département.")],
      }),
      words,
    );
    expect(page.facts).toEqual([
      { kind: "who", value: "Public de test.", section: null },
      { kind: "documents", value: "1 pièces", section: 0 },
      { kind: "where", value: "À la préfecture du département.", section: null },
    ]);
    expect(page.sections).toEqual([
      {
        title: "Pièces à fournir",
        kind: "documents",
        items: [{ type: "list", ordered: false, items: [[{ text: "Une photo d'identité" }]] }],
      },
    ]);
  });

  it("puts the opening paragraph under the title when it starts with the summary", () => {
    const opening = "Le Fonds finance des micro-crédits ; il soutient les jeunes et les femmes.";
    const page = procedurePage(
      detail({
        summary: "Le fonds finance des micro-crédits.",
        blocks: [p(opening), p("Qui peut en bénéficier ?"), p("Les jeunes porteurs d'un projet.")],
      }),
      words,
    );
    expect(page.lead).toEqual([{ text: opening }]);
    expect(page.intro).toEqual([]);
  });

  it("keeps a different summary as the lead, and none when there is none", () => {
    const blocks = [p("Un texte d'introduction différent.")];
    const summarised = procedurePage(detail({ summary: "Résumé de test.", blocks }), words);
    expect(summarised.lead).toEqual([{ text: "Résumé de test." }]);
    expect(summarised.intro).toHaveLength(1);
    expect(procedurePage(detail({ summary: " ", blocks }), words).lead).toBeNull();
  });
});
