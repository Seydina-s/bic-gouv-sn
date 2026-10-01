import { describe, expect, it } from "vitest";
import {
  byClosingDate,
  isOfficialOpportunityUrl,
  isOpen,
  opportunityDraftSchema,
} from "./opportunities.schema";
import { readOpportunities } from "./tolerant-reader";

const draft = {
  kind: "formation",
  title: "Formation fictive",
  organization: "Organisme fictif",
  summary: "Résumé fictif, recopié de la page officielle.",
  deadline: "2026-10-15",
  officialUrl: "https://3fpt.sn/appel-a-candidature/",
};

describe("opportunities", () => {
  it("lead only to official portals, State domains included", () => {
    expect(isOfficialOpportunityUrl("https://www.fonctionpublique.gouv.sn/concours")).toBe(true);
    expect(isOfficialOpportunityUrl("https://financement.der.sn/appel-a-projet/")).toBe(true);
    expect(isOfficialOpportunityUrl("https://marchesdusenegal.com/avis")).toBe(false);
    expect(isOfficialOpportunityUrl("https://gouv.sn.example.com/")).toBe(false);
    expect(isOfficialOpportunityUrl("pas une adresse")).toBe(false);
    expect(opportunityDraftSchema.safeParse(draft).success).toBe(true);
    expect(
      opportunityDraftSchema.safeParse({ ...draft, officialUrl: "http://3fpt.sn/" }).success,
    ).toBe(false);
  });

  it("stay open until their closing date, or always without one", () => {
    expect(isOpen({ deadline: "2026-10-15" }, "2026-10-15")).toBe(true);
    expect(isOpen({ deadline: "2026-10-15" }, "2026-10-16")).toBe(false);
    expect(isOpen({ deadline: null }, "2030-01-01")).toBe(true);
  });

  it("come closing soonest first, those without a date after", () => {
    const at = (deadline: string | null, publishedAt: string) => ({ deadline, publishedAt });
    const sorted = [
      at(null, "2026-10-01T10:00:00Z"),
      at("2026-10-20", "2026-10-01T10:00:00Z"),
      at(null, "2026-10-02T10:00:00Z"),
      at("2026-10-05", "2026-09-01T10:00:00Z"),
    ].sort(byClosingDate);
    expect(sorted.map((item) => item.deadline ?? item.publishedAt)).toEqual([
      "2026-10-05",
      "2026-10-20",
      "2026-10-02T10:00:00Z",
      "2026-10-01T10:00:00Z",
    ]);
  });

  it("are read one by one: an unknown kind is left out, the others still show", () => {
    const shown = {
      ...draft,
      id: "00000000-0000-4000-8000-000000000001",
      publishedAt: "2026-10-01T10:00:00Z",
    };
    const fromTheFuture = { ...shown, id: "00000000-0000-4000-8000-000000000002", kind: "stage" };
    expect(readOpportunities({ opportunities: [shown, fromTheFuture] })).toEqual({
      opportunities: [shown],
    });
    expect(readOpportunities({ items: [] })).toBeNull();
  });
});
