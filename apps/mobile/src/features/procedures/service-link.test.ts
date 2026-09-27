import type { ProcedurePage } from "./procedure-page";
import { serviceCategoryIn, whereToGo } from "./service-link";

// Placeholder texts shaped like the "where to go" answers of e-senegal.sn sheets.
describe("where a procedure sends people", () => {
  it.each([
    ["Au commissariat de police.", "police"],
    ["À la brigade de gendarmerie la plus proche.", "gendarmerie"],
    ["Au greffe du tribunal du lieu de naissance.", "tribunal"],
    ["À la préfecture de votre département.", "prefecture"],
    ["À la mairie de votre commune (état civil).", "mairie"],
    ["Au centre d'état-civil.", "mairie"],
    ["Sur le site du ministère.", null],
  ])("reads « %s » as %s", (text, kind) => {
    expect(serviceCategoryIn(text)).toBe(kind);
  });

  it("reads the brief's answer first, else the text of the where section", () => {
    const empty: ProcedurePage = { lead: null, facts: [], intro: [], sections: [] };
    expect(whereToGo(empty)).toBeNull();
    expect(
      whereToGo({ ...empty, facts: [{ kind: "where", value: "Au commissariat.", section: null }] }),
    ).toBe("police");
    expect(
      whereToGo({
        ...empty,
        sections: [
          {
            title: "Où s'adresser ?",
            kind: "where",
            items: [{ type: "list", ordered: false, items: [[{ text: "Au tribunal régional" }]] }],
          },
        ],
      }),
    ).toBe("tribunal");
  });
});
