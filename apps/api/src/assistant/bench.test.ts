import { describe, expect, it } from "vitest";
import {
  FIXED_AFTER,
  generatedCases,
  judgeBench,
  retrievalCases,
  summarizeBench,
  trapCases,
  updateWeaknesses,
  weaknessCases,
  withEvidence,
  type BenchCase,
} from "./bench";
import type { GroundedAnswer } from "./grounded-answer";
import type { Passage } from "./passages";

// Placeholder pages, not real content.
function page(
  n: number,
  kind: Passage["kind"],
  title: string,
  publishedOn: string | null,
  section?: string,
): Passage {
  return {
    id: `content-${String(n)}:fr:0`,
    contentId: `content-${String(n)}`,
    kind,
    lang: "fr",
    status: "official",
    title,
    sourceUrl: `https://www.presidence.sn/fr/test-${String(n)}`,
    publishedOn,
    contentHash: "1".repeat(64),
    ...(section === undefined ? {} : { section }),
    text: "Texte fictif.",
  };
}

const TODAY = "2026-10-17";
const PAGES = [
  page(1, "news-article", "Article fictif du jour", TODAY),
  page(2, "news-article", "Article fictif de lundi", "2026-10-12"),
  page(3, "news-article", "Conseil fictif", "2026-10-14", "conseil-des-ministres"),
  page(4, "news-article", "Ancien conseil fictif", "2026-09-30", "conseil-des-ministres"),
  page(5, "procedure", "Demander un document fictif", null),
  page(6, "procedure", "Liste fictive", null),
  {
    ...page(7, "service", "Préfecture fictive", null),
    text: "Préfecture fictive\nRue fictive, Dakar",
  },
  { ...page(8, "service", "Gendarmerie", null), text: "Gendarmerie\nsans adresse" },
];

function answered(urls: string[], dates: (string | null)[] = []): GroundedAnswer {
  return {
    status: "answered",
    text: "Réponse.",
    sources: urls.map((url, n) => ({
      ...page(90 + n, "news-article", "Source", dates[n] ?? null),
      sourceUrl: url,
    })),
    rejected: null,
    usage: null,
  };
}

const refusedAnswer = (status: GroundedAnswer["status"]): GroundedAnswer => ({
  status,
  text: null,
  sources: [],
  rejected: null,
  usage: null,
});

describe("the bench's questions", () => {
  it("are drawn from the base: the day's news, the latest Council, procedures, services", () => {
    const cases = generatedCases(PAGES, TODAY);
    const today = cases.find((c) => c.question === "Quelles sont les actualités du jour ?");
    expect(today).toMatchObject({ kind: "news-period", freshFrom: TODAY });
    // This week runs from Monday 12 October.
    expect(cases.find((c) => c.question.includes("cette semaine"))?.freshFrom).toBe("2026-10-12");
    expect(cases.find((c) => c.kind === "council")?.sources).toEqual([
      "https://www.presidence.sn/fr/test-3",
    ]);
    expect(cases.filter((c) => c.kind === "procedure").map((c) => c.question)).toEqual([
      "Comment demander un document fictif ?",
    ]);
    expect(cases.find((c) => c.kind === "service")?.question).toBe(
      "Où se trouve Préfecture fictive à Dakar ?",
    );
  });

  it("accept the newest news given when nothing was published in the period", () => {
    const cases = generatedCases(PAGES, "2026-10-20");
    // All four articles are given: the oldest of them may be cited.
    expect(cases.find((c) => c.lang === "en")?.freshFrom).toBe("2026-09-30");
    const many = Array.from({ length: 10 }, (_, n) =>
      page(60 + n, "news-article", "Article fictif", `2026-10-${String(10 + n)}`),
    );
    // Ten articles, eight given: from the 12th.
    expect(generatedCases(many, "2026-10-25").find((c) => c.lang === "fr")?.freshFrom).toBe(
      "2026-10-12",
    );
  });

  it("take half of the retrieval set each week, and every trap", () => {
    const set = Array.from({ length: 6 }, (_, n) => ({
      question: `Question fictive ${String(n)}`,
      style: "citizen" as const,
      lang: "fr" as const,
      expected: ["https://example.test/"],
    }));
    const thisWeek = retrievalCases(set, TODAY).map((c) => c.question);
    const nextWeek = retrievalCases(set, "2026-10-24").map((c) => c.question);
    expect(thisWeek).toHaveLength(3);
    expect(new Set([...thisWeek, ...nextWeek]).size).toBe(6);
    expect(
      trapCases([{ question: "Une opinion fictive ?", accepted: ["out_of_scope"] }])[0],
    ).toMatchObject({ kind: "trap", accepted: ["out_of_scope"] });
  });
});

describe("a bench verdict", () => {
  const procedure: BenchCase = {
    id: "p",
    kind: "procedure",
    question: "Comment faire ?",
    lang: "fr",
    accepted: ["answered"],
    sources: ["https://e-senegal.sn/#/a"],
  };

  it("passes the right page, and says in plain words why anything else fails", () => {
    expect(judgeBench(procedure, answered(["https://e-senegal.sn/#/a"])).passed).toBe(true);
    expect(judgeBench(procedure, answered(["https://e-senegal.sn/#/b"])).reason).toBe(
      "N'a pas cité la page attendue.",
    );
    expect(judgeBench(procedure, refusedAnswer("not_found")).reason).toContain("introuvable");
    expect(judgeBench(procedure, null)).toMatchObject({ status: "failed", passed: false });
  });

  it("fails an old page for the day's news, and counts a trap answered as invented", () => {
    const news: BenchCase = {
      id: "n",
      kind: "news-period",
      question: "Actualités ?",
      lang: "fr",
      accepted: ["answered"],
      freshFrom: TODAY,
    };
    expect(judgeBench(news, answered(["u"], ["2026-09-01"])).reason).toContain("plus ancienne");
    const trap: BenchCase = { ...news, id: "t", kind: "trap", accepted: ["not_found"] };
    const verdicts = [
      judgeBench(trap, answered(["u"])),
      judgeBench(news, answered(["u"], [TODAY])),
    ];
    expect(summarizeBench(verdicts)).toMatchObject({ cases: 2, passed: 1, invented: 1 });
  });

  it("keeps, for a failure only, the extracts the model was numbered and its reply", () => {
    const trace = {
      searched: "Comment faire ? démarche",
      given: [page(5, "procedure", "Demander un document fictif", null)],
      reply: '{"status":"not_found","answer":"","citations":[]}',
    };
    const failed = withEvidence(judgeBench(procedure, refusedAnswer("not_found")), trace);
    expect(failed.evidence).toEqual({
      searched: "Comment faire ? démarche",
      extracts: [
        {
          number: 1,
          title: "Demander un document fictif",
          url: "https://www.presidence.sn/fr/test-5",
          publishedOn: null,
          text: "Texte fictif.",
        },
      ],
      reply: trace.reply,
    });
    const passed = withEvidence(
      judgeBench(procedure, answered(["https://e-senegal.sn/#/a"])),
      trace,
    );
    expect(passed.evidence).toBeUndefined();
    // No answer at all (the service failed): nothing to keep.
    expect(withEvidence(judgeBench(procedure, null), null).evidence).toBeUndefined();
  });
});

describe("a fair verdict", () => {
  it("takes a newer page as right for a question about the latest", () => {
    const set = [
      {
        question: "Qu'a dit le dernier Conseil des ministres ?",
        style: "citizen" as const,
        lang: "fr" as const,
        expected: ["https://www.presidence.sn/fr/test-4"],
      },
      {
        question: "Question fictive sans date",
        style: "citizen" as const,
        lang: "fr" as const,
        expected: ["https://www.presidence.sn/fr/test-4"],
      },
    ];
    const both = [
      ...retrievalCases(set, TODAY, () => "2026-09-30"),
      ...retrievalCases(set, "2026-10-24", () => "2026-09-30"),
    ];
    const latest = both.find((c) => c.question.startsWith("Qu'a dit"));
    const plain = both.find((c) => c.question.startsWith("Question fictive"));
    expect(latest?.orNewerThan).toBe("2026-09-30");
    expect(plain?.orNewerThan).toBeUndefined();
    const newer = answered(["https://www.presidence.sn/fr/test-3"], ["2026-10-14"]);
    expect(latest === undefined ? null : judgeBench(latest, newer).passed).toBe(true);
    expect(plain === undefined ? null : judgeBench(plain, newer).passed).toBe(false);
  });

  it("judges a known weakness as the bench judges it today", () => {
    const old: BenchCase = {
      id: "same",
      kind: "search-citizen",
      question: "dernier cm",
      lang: "fr",
      accepted: ["answered"],
      sources: ["https://x/old"],
    };
    const today: BenchCase = { ...old, orNewerThan: "2026-09-30" };
    const weakness = { case: old, since: TODAY, reason: "", passedInARow: 0 };
    expect(weaknessCases([weakness], [], [today])).toEqual([today]);
  });
});

describe("the known weaknesses", () => {
  const c: BenchCase = {
    id: "w",
    kind: "search-citizen",
    question: "dernier cm",
    lang: "fr",
    accepted: ["answered"],
  };

  it("keep every failure until it passes twice in a row, then count it as fixed", () => {
    let weaknesses = updateWeaknesses(
      [],
      [c],
      [judgeBench(c, refusedAnswer("not_found"))],
      TODAY,
    ).weaknesses;
    expect(weaknesses).toMatchObject([{ since: TODAY, passedInARow: 0 }]);
    // Asked again the next week, even when it is no longer among the questions drawn.
    expect(weaknessCases(weaknesses, [])).toEqual([c]);
    expect(weaknessCases(weaknesses, [c])).toEqual([]);
    for (let run = 1; run <= FIXED_AFTER; run += 1) {
      const update = updateWeaknesses(weaknesses, [c], [judgeBench(c, answered(["u"]))], TODAY);
      weaknesses = update.weaknesses;
      expect(update.fixed).toHaveLength(run === FIXED_AFTER ? 1 : 0);
    }
    expect(weaknesses).toEqual([]);
  });

  it("start the streak again when a weakness fails anew", () => {
    const once = updateWeaknesses([], [c], [judgeBench(c, refusedAnswer("not_found"))], TODAY);
    const passed = updateWeaknesses(once.weaknesses, [c], [judgeBench(c, answered(["u"]))], TODAY);
    const again = updateWeaknesses(
      passed.weaknesses,
      [c],
      [judgeBench(c, refusedAnswer("not_found"))],
      TODAY,
    );
    expect(again.weaknesses).toMatchObject([{ passedInARow: 0, since: TODAY }]);
  });
});
