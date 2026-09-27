import type { Block } from "@bgs/shared-types";
import { isQuestionHeading, kindOf, toProcedureSheet } from "./procedure-sheet";

const p = (text: string): Block => ({ type: "paragraph", inlines: [{ text }] });
describe("recognising the structure of an e-senegal.sn procedure", () => {
  it("turns question paragraphs into titled sections, the rest into their content", () => {
    const sheet = toProcedureSheet([
      p("Pièce justifiant de l'identité obligatoire."),
      p("Qui peut obtenir une carte nationale d'identité ?"),
      p("Tout citoyen sénégalais, âgé d'au moins 5 ans."),
      p("Où s'adresser ?"),
      p("Au commissariat de police."),
    ]);
    expect(sheet.intro).toEqual([
      { type: "text", inlines: [{ text: "Pièce justifiant de l'identité obligatoire." }] },
    ]);
    expect(sheet.sections.map((s) => [s.title, s.kind])).toEqual([
      ["Qui peut obtenir une carte nationale d'identité ?", "who"],
      ["Où s'adresser ?", "where"],
    ]);
  });

  it("makes one list of consecutive bullet paragraphs, markers taken off", () => {
    const [section] = toProcedureSheet([
      p("Quels sont les documents à fournir ?"),
      p("• Un certificat de résidence"),
      p("·Un extrait de naissance"),
      p("Après la liste."),
    ]).sections;
    expect(section?.kind).toBe("documents");
    expect(section?.items[0]).toEqual({
      type: "list",
      ordered: false,
      items: [[{ text: "Un certificat de résidence" }], [{ text: "Un extrait de naissance" }]],
    });
    expect(section?.items[1]?.type).toBe("text");
  });

  it("makes a list of short lines after a lead-in ending with a colon", () => {
    const [section] = toProcedureSheet([
      p("Quels sont les documents à fournir ?"),
      p("Le dossier comprend les pièces suivantes :"),
      p("La demande adressée au maire ;"),
      p("Le titre d'occupation ;"),
      p("Le plan de situation."),
      p("Des pièces complémentaires peuvent être demandées."),
    ]).sections;
    expect(section?.items.map((item) => item.type)).toEqual(["text", "list", "text"]);
    const list = section?.items[1];
    expect(list?.type === "list" ? list.items.length : 0).toBe(3);
  });

  it("keeps a lone line after a colon as text", () => {
    const [section] = toProcedureSheet([
      p("Comment renouveler ?"),
      p("Pour le renouvellement, présenter :"),
      p("La copie de l'ancienne carte."),
    ]).sections;
    expect(section?.items.map((item) => item.type)).toEqual(["text", "text"]);
  });

  it("turns NB remarks into notes, the rest of the wording unchanged", () => {
    const [section] = toProcedureSheet([
      p("Quel est le coût ?"),
      p("C'est gratuit."),
      p("NB : Une taxe municipale est à régler."),
      p("Nbre de pièces : deux."),
    ]).sections;
    expect(section?.items[1]).toEqual({
      type: "note",
      inlines: [{ text: "Une taxe municipale est à régler." }],
    });
    expect(section?.items[2]?.type).toBe("text");
  });

  it("keeps a question the source leaves unanswered, as a line of what precedes it", () => {
    const sheet = toProcedureSheet([
      p("Quand faire la demande ?"),
      p("Où s'adresser ?"),
      p("À la mairie."),
      p("Quel est le coût ?"),
    ]);
    expect(sheet.intro).toEqual([
      { type: "text", inlines: [{ text: "Quand faire la demande ?" }] },
    ]);
    expect(sheet.sections.map((s) => s.kind)).toEqual(["where"]);
    expect(sheet.sections[0]?.items).toEqual([
      { type: "text", inlines: [{ text: "À la mairie." }] },
      { type: "text", inlines: [{ text: "Quel est le coût ?" }] },
    ]);
  });

  it("cuts a paragraph at its line breaks, formatting kept", () => {
    const sheet = toProcedureSheet([
      {
        type: "paragraph",
        inlines: [
          { text: "Où s'adresser ?\n " },
          { text: "À la mairie", bold: true },
          { text: " de Dakar.\n" },
        ],
      },
    ]);
    expect(sheet.sections).toEqual([
      {
        title: "Où s'adresser ?",
        kind: "where",
        items: [
          {
            type: "text",
            inlines: [{ text: "À la mairie", bold: true }, { text: " de Dakar." }],
          },
        ],
      },
    ]);
  });

  it("sets apart a question and its answer written on one line", () => {
    const sheet = toProcedureSheet([
      p("Où s'adresser ? Office national de l'assainissement du Sénégal (ONAS)"),
      p("Quel est le délai de délivrance ? 2 jours. Que faire en cas de perte ou de vol ?"),
      p("Faire une nouvelle demande."),
    ]);
    expect(sheet.sections.map((s) => [s.title, s.kind, s.items.length])).toEqual([
      ["Où s'adresser ?", "where", 1],
      ["Quel est le délai de délivrance ?", "time", 1],
      ["Que faire en cas de perte ou de vol ?", "problem", 1],
    ]);
    expect(sheet.sections[1]?.items[0]).toEqual({ type: "text", inlines: [{ text: "2 jours." }] });
  });

  it.each([
    ["no space", "Résultats affichés après la réunion.Comment renouveler ?"],
    ["no full stop", "Cette somme est payable aux impôts Comment renouveler ?"],
    ["no capital", "Le contribuable ou son mandataire. comment renouveler ?"],
  ])("finds the question after a statement written with %s", (_, line) => {
    const sheet = toProcedureSheet([p(line), p("Refaire la demande.")]);
    expect(sheet.intro).toHaveLength(1);
    expect(sheet.sections.map((s) => s.kind)).toEqual(["how"]);
  });

  it("takes the space after a bold « NB : » off the remark", () => {
    const [section] = toProcedureSheet([
      p("Quel est le coût ?"),
      {
        type: "paragraph",
        inlines: [{ text: "NB :", bold: true }, { text: " Une taxe est due." }],
      },
    ]).sections;
    expect(section?.items).toEqual([{ type: "note", inlines: [{ text: "Une taxe est due." }] }]);
  });

  it("takes a heading phrase apart from the content it runs on into", () => {
    const [section] = toProcedureSheet([
      p("Pour en savoir plus… Direction générale des douanes"),
    ]).sections;
    expect(section?.title).toBe("Pour en savoir plus…");
    expect(section?.items).toEqual([
      { type: "text", inlines: [{ text: "Direction générale des douanes" }] },
    ]);
  });

  it("drops the number of a numbered heading, and keeps list entries whole", () => {
    const [section] = toProcedureSheet([
      p("1. Qui peut faire la demande ?"),
      p("• Le titulaire ? Oui, ou son mandataire."),
    ]).sections;
    expect(section?.title).toBe("Qui peut faire la demande ?");
    expect(section?.items).toEqual([
      {
        type: "list",
        ordered: false,
        items: [[{ text: "Le titulaire ? Oui, ou son mandataire." }]],
      },
    ]);
  });

  it("reads the source's heading tags by their words: a sentence set as one is text", () => {
    const heading = (text: string, bold = false): Block => ({
      type: "heading",
      level: 3,
      inlines: [{ text, bold }],
    });
    const sheet = toProcedureSheet([
      heading("L'extrait du casier judiciaire permet de connaître le passé pénal."),
      heading("Où s'adresser ?", true),
      heading("Au greffe du tribunal du lieu de naissance."),
      heading("Ministère de la Justice"),
    ]);
    expect(sheet.intro.map((item) => item.type)).toEqual(["text"]);
    expect(sheet.sections.map((s) => [s.title, s.items.length])).toEqual([["Où s'adresser ?", 2]]);
  });

  it("takes a bold line naming a subject for a heading, not a subdivision or an answer", () => {
    const bold = (text: string): Block => ({ type: "paragraph", inlines: [{ text, bold: true }] });
    const sheet = toProcedureSheet([
      p("Une introduction."),
      bold("Pièces à fournir :"),
      bold("Pour les étrangers :"),
      p("• Une photo"),
      bold("CAP"),
      p("Quel est le coût ?"),
      bold("Gratuit"),
    ]);
    expect(sheet.sections.map((s) => [s.title, s.kind])).toEqual([
      ["Pièces à fournir :", "documents"],
      ["Quel est le coût ?", "cost"],
    ]);
    expect(sheet.sections[0]?.items.map((item) => item.type)).toEqual(["text", "list", "text"]);
    expect(sheet.sections[1]?.items).toEqual([
      { type: "text", inlines: [{ text: "Gratuit", bold: true }] },
    ]);
  });

  it("recognises headings written as questions or known phrases, not ordinary lines", () => {
    expect(isQuestionHeading("Quelle est le délai de délivrance")).toBe(true);
    expect(isQuestionHeading("Pour en savoir plus…")).toBe(true);
    expect(isQuestionHeading("Service(s) à contacter :")).toBe(true);
    expect(isQuestionHeading("Textes de référence :")).toBe(true);
    expect(isQuestionHeading("Durée de validité ?")).toBe(true);
    expect(isQuestionHeading("Pour le renouvellement, présenter :")).toBe(false);
    expect(isQuestionHeading("Au commissariat de police.")).toBe(false);
    expect(isQuestionHeading("NB : Qui peut le faire ?")).toBe(false);
    expect(isQuestionHeading("Où déposer la demande")).toBe(true);
    expect(isQuestionHeading("Ou au commissariat de police")).toBe(false);
    expect(isQuestionHeading(`Quelles pièces ${"x".repeat(90)}`)).toBe(false);
    expect(isQuestionHeading(`${"x".repeat(160)} ?`)).toBe(false);
  });

  it.each([
    ["Quels sont les documents à fournir ?", "documents"],
    ["Quelle est la nature des pièces obtenues ?", "result"],
    ["Quel est l'intitulé de la pièce délivrée ?", "result"],
    ["Quel est le coût ?", "cost"],
    ["Quel est le coût de la pièce délivrée ?", "cost"],
    ["Quel est le taux de la cotisation ?", "cost"],
    ["Quel est le délai d'exécution ?", "time"],
    ["Quelle est la durée de validité ?", "validity"],
    ["Quelles sont les modalités de sélection ?", "how"],
    ["Combien de temps faut-il ?", "time"],
    ["Qui peut initier la démarche ?", "who"],
    ["1- Qui peut faire cette démarche ?", "who"],
    ["A qui est-il délivré ?", "who"],
    ["Quelles sont les conditions à remplir ?", "who"],
    ["Dans quels cas ?", "who"],
    ["Quand déclarer la naissance?", "when"],
    ["Quelle est la date d'effet de la pension ?", "when"],
    ["Quelle est la périodicité ?", "when"],
    ["Où déposer le dossier ?", "where"],
    ["À qui s'adresser ?", "where"],
    ["Comment renouveler un passeport ?", "how"],
    ["Que faire en cas de perte ou de vol ?", "problem"],
    ["Que faire en cas de rejet ?", "problem"],
    ["Quelles sont les obligations de l'usager ?", "duty"],
    ["Quelles sont les sanctions prévues en cas de non déclaration ?", "legal"],
    ["Textes de référence :", "legal"],
    ["Pour en savoir plus…", "more"],
    ["Quelle différence ?", "info"],
  ])("files « %s » as %s", (title, kind) => {
    expect(kindOf(title)).toBe(kind);
  });
});
