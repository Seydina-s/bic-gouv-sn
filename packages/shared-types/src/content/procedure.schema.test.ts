import { describe, expect, it } from "vitest";
import { procedure } from "../testing/fixtures";
import { procedureSchema } from "./procedure.schema";

describe("procedureSchema", () => {
  it("accepts a traceable procedure from e-senegal.sn", () => {
    expect(procedureSchema.safeParse(procedure()).success).toBe(true);
  });

  it("keeps unknown facts empty instead of guessing them", () => {
    const unknown = procedure({ costFcfa: null, delayDays: null, summary: null, documents: [] });
    expect(procedureSchema.safeParse(unknown).success).toBe(true);
  });

  it.each([
    ["a source outside the official sites", { sourceUrl: "https://example.com/demarche" }],
    ["a negative fee", { costFcfa: -1 }],
    ["an empty document entry", { documents: [" "] }],
    ["a plain-http useful link", { usefulLinks: [{ name: "Lien", url: "http://a.sn" }] }],
  ])("refuses %s", (_label, overrides) => {
    expect(procedureSchema.safeParse(procedure(overrides)).success).toBe(false);
  });
});

describe("procedure slugs", () => {
  it("accepts the identifiers the source really uses (capitals, as in ...-FRA)", () => {
    expect(
      procedureSchema.safeParse(procedure({ slug: "demander-une-autorisation-FRA" })).success,
    ).toBe(true);
    expect(procedureSchema.safeParse(procedure({ slug: "../evil" })).success).toBe(false);
  });
});
