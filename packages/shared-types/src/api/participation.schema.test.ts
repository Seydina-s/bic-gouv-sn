import { describe, expect, it } from "vitest";
import { participationEntrySchema, reportSubmissionSchema } from "./participation.schema";

// Placeholder texts, not real content.
const report = {
  category: "voirie",
  detail: null,
  text: "Un signalement fictif pour les tests.",
  place: null,
  photo: null,
  lang: "fr",
};

describe("reportSubmissionSchema", () => {
  it("asks the kind of problem for the other ones, and only for them", () => {
    expect(reportSubmissionSchema.safeParse(report).success).toBe(true);
    expect(
      reportSubmissionSchema.safeParse({ ...report, category: "autre", detail: "Feu tricolore" })
        .success,
    ).toBe(true);
    expect(reportSubmissionSchema.safeParse({ ...report, category: "autre" }).success).toBe(false);
    expect(reportSubmissionSchema.safeParse({ ...report, detail: "Feu tricolore" }).success).toBe(
      false,
    );
    expect(
      reportSubmissionSchema.safeParse({ ...report, category: "autre", detail: "  a " }).success,
    ).toBe(false);
  });
});

describe("participationEntrySchema", () => {
  it("reads reports received before the kind of problem was asked", () => {
    const entry = participationEntrySchema.parse({
      id: "00000000-0000-4000-8000-0000000000a1",
      receivedAt: "2026-10-01T09:00:00.000Z",
      lang: "fr",
      text: "Un signalement fictif pour les tests.",
      status: "new",
      handledBy: null,
      handledAt: null,
      type: "report",
      category: "voirie",
      place: null,
      photoId: null,
    });
    expect(entry.type === "report" ? entry.detail : "absent").toBeNull();
  });
});
