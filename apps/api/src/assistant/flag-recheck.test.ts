import type { AssistantFlag, AssistantSource } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { flagRecheck, nextRechecks, recheckChanged } from "./flag-recheck";
import type { GroundedAnswer } from "./grounded-answer";

// Placeholders: no real question nor page.
const source = (n: number): AssistantSource => ({
  kind: "procedure",
  contentId: `procedure-${String(n)}`,
  slug: `demarche-${String(n)}`,
  title: `Démarche fictive ${String(n)}`,
  url: `https://e-senegal.sn/#/comprendre-ma-demarche/demarche/demarche-${String(n)}`,
  publishedOn: null,
});

const flag = (id: string, over: Partial<AssistantFlag> = {}): AssistantFlag => ({
  id,
  receivedAt: "2026-10-20T10:00:00.000Z",
  question: "Comment demander la démarche fictive ?",
  lang: "fr",
  mode: "ask",
  status: "not_found",
  answer: null,
  sources: [],
  ...over,
});

const answer = (over: Partial<GroundedAnswer>): GroundedAnswer => ({
  status: "answered",
  text: "Une réponse fictive.",
  sources: [],
  rejected: null,
  usage: null,
  ...over,
});

const ID_A = "00000000-0000-4000-8000-00000000000a";
const ID_B = "00000000-0000-4000-8000-00000000000b";

describe("flagged questions asked again by the bench (AST-30g)", () => {
  it("keep the reply as the app shows it, dated, at most 8 sources", () => {
    const sources = Array.from({ length: 10 }, (_, n) => source(n));
    expect(flagRecheck(answer({ text: "  Réponse.  " }), sources, "2026-11-01")).toEqual({
      askedOn: "2026-11-01",
      status: "answered",
      answer: "Réponse.",
      sources: sources.slice(0, 8),
    });
    const refused = flagRecheck(answer({ status: "not_found", text: null }), [], "2026-11-01");
    expect(refused).toMatchObject({ status: "not_found", answer: null, sources: [] });
  });

  it("tell a reply that changed: another status or other pages, not another order", () => {
    const flagged = flag(ID_A, { status: "answered", sources: [source(1), source(2)] });
    const same = { askedOn: "2026-11-01", status: "answered" as const, answer: "Autre texte." };
    expect(recheckChanged(flagged, { ...same, sources: [source(2), source(1)] })).toBe(false);
    expect(recheckChanged(flagged, { ...same, sources: [source(1)] })).toBe(true);
    expect(recheckChanged(flagged, { ...same, status: "not_found", sources: [] })).toBe(true);
  });

  it("keep this run's replies, the last one when unanswered, none for an erased flag", () => {
    const old = { askedOn: "2026-10-25", status: "not_found" as const, answer: null, sources: [] };
    const now = { ...old, askedOn: "2026-11-01", status: "answered" as const, answer: "Oui." };
    const previous = { [ID_A]: old, [ID_B]: old, "erased-flag": old };
    expect(
      nextRechecks(
        [flag(ID_A), flag(ID_B)],
        previous,
        new Map([
          [ID_A, now],
          [ID_B, null],
        ]),
      ),
    ).toEqual({ [ID_A]: now, [ID_B]: old });
  });
});
