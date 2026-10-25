import { describe, expect, it } from "vitest";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";
import { PASSAGES_GIVEN, questionIntent, retrievePassages, searchedLanguages } from "./retrieval";

// Placeholder texts, not real content.
function passage(
  n: number,
  publishedOn: string,
  section: string,
  text: string,
  part = 0,
  publisher = "Présidence",
): Passage {
  return {
    id: `content-${String(n)}:fr:${String(part)}`,
    contentId: `content-${String(n)}`,
    kind: "news-article",
    lang: "fr",
    status: "official",
    title: `Titre fictif ${String(n)}`,
    sourceUrl: `https://www.presidence.sn/fr/actualites/test-${String(n)}/`,
    publishedOn,
    contentHash: "1".repeat(64),
    section,
    publisher,
    text,
  };
}

const TODAY = "2026-10-08";

const index = new PassageIndex([
  passage(1, "2024-05-02", "international", "Le Président en visite officielle fictive à Paris."),
  passage(2, "2026-10-06", "communiques", "Le Président reçoit une délégation fictive."),
  passage(3, "2026-10-07", "international", "Visite officielle fictive du Président en Égypte."),
  passage(4, "2026-09-30", "conseil-des-ministres", "Le Conseil a examiné un projet fictif.", 0),
  passage(4, "2026-09-30", "conseil-des-ministres", "Mesures individuelles fictives.", 1),
  passage(5, "2026-09-10", "conseil-des-ministres", "Un ancien conseil fictif."),
  passage(
    6,
    "2026-10-08",
    "actualites",
    "Remise fictive de matériel agricole.",
    0,
    "Ministère de l'Agriculture",
  ),
  passage(
    7,
    "2026-03-02",
    "actualites",
    "Le ministre de l'Intérieur inaugure un commissariat fictif.",
    0,
    "Ministère de l'Intérieur et de la Sécurité publique",
  ),
  passage(
    8,
    "2026-03-03",
    "communiques",
    "Un commissariat fictif est inauguré par le Président.",
    0,
  ),
  passage(9, "2026-05-25", "focus", "Profil fictif du nouveau Premier ministre.", 0),
  passage(10, "2024-04-02", "actualites", "Un Premier ministre fictif est nommé.", 0, "Primature"),
]);

describe("the question's intent", () => {
  it("hears a question about recent news, and a section it names", () => {
    expect(questionIntent("Où est allé le président cette semaine ?")).toEqual({
      recent: true,
      current: false,
      section: null,
      publisher: "Présidence",
      members: [],
      period: null,
      procedure: false,
      composition: false,
    });
    expect(questionIntent("Qu'a dit le dernier Conseil des ministres ?")).toMatchObject({
      recent: true,
      section: "conseil-des-ministres",
    });
    expect(questionIntent("Comment obtenir un passeport ?")).toEqual({
      recent: false,
      current: false,
      section: null,
      publisher: null,
      members: [],
      period: null,
      procedure: true,
      composition: false,
    });
  });

  it("hears the news of a period asked with no other subject, in French, English and Wolof", () => {
    const period = (question: string) => questionIntent(question).period;
    expect(period("Quelles sont les actualités du jour ?")).toBe("today");
    expect(period("C'est quoi les actualités d'aujourd'hui ?")).toBe("today");
    expect(period("Quoi de neuf aujourd'hui ?")).toBe("today");
    expect(period("What's the news today?")).toBe("today");
    expect(period("Lan mooy xibaar yi tey ?")).toBe("today");
    expect(period("Qu'a fait le gouvernement cette semaine ?")).toBe("week");
    expect(period("Quelles sont les dernières nouvelles du gouvernement ?")).toBe("latest");
    expect(period("Les infos d'hier")).toBe("yesterday");
    // A subject: searched as before.
    expect(period("Où est allé le président cette semaine ?")).toBeNull();
    expect(period("Qu'a dit le dernier Conseil des ministres ?")).toBeNull();
    expect(period("Quelles sont les dernières actualités du ministère de la Santé ?")).toBeNull();
    expect(period("Les actualités sur la pêche aujourd'hui")).toBeNull();
    expect(period("Comment obtenir un passeport ?")).toBeNull();
  });

  it("hears who holds a post, and the ministry named, as people type them", () => {
    expect(questionIntent("c ki le premier ministre")).toMatchObject({
      current: true,
      publisher: "Primature",
    });
    expect(questionIntent("Les dernières nouvelles du ministère de l'Intérieur ?")).toMatchObject({
      recent: true,
      publisher: "Ministère de l'Intérieur et de la Sécurité publique",
    });
    // "Justice" alone is not the ministry.
    expect(questionIntent("Que fait l'État pour la justice sociale ?").publisher).toBeNull();
  });
});

describe("a portfolio without a site of its own", () => {
  const communication = new PassageIndex([
    passage(
      20,
      "2026-07-02",
      "conseil-des-ministres",
      "Le Ministre de la Communication fictif, Bacary SARR, a fait une communication.",
      0,
      "Primature",
    ),
    passage(
      21,
      "2026-10-01",
      "conseil-des-ministres",
      "Bacary SARR a présenté un rapport fictif au Conseil.",
      0,
      "Primature",
    ),
    passage(22, "2026-10-07", "actualites", "Une communication fictive sur la pêche.", 0),
    passage(23, "2026-10-08", "actualites", "Le ministre fictif Moussa SARR en visite.", 0),
  ]);

  it("is known by its minister, from the Government's official page", () => {
    expect(questionIntent("Dernières activités du ministère de la communication").members).toEqual([
      {
        name: "Bacary SARR",
        post: "Ministre de la Communication et des Relations avec les Institutions, Porte-Parole du Gouvernement",
      },
    ]);
    // A portfolio is named only with "ministre" or "ministère".
    expect(questionIntent("Comment améliorer la communication ?").members).toEqual([]);
    expect(questionIntent("Qu'a dit le porte-parole du gouvernement ?").members).toHaveLength(1);
  });

  it("brings the newest extracts naming the minister for a news question", () => {
    const given = retrievePassages(
      communication,
      "Dernières activités du ministère de la communication",
      "fr",
      TODAY,
    );
    expect(given.slice(0, 2).map((item) => item.contentId)).toEqual(["content-21", "content-20"]);
  });
});

describe("the extracts given to the model", () => {
  it("bring the newest article of the section named, from its opening", () => {
    const given = retrievePassages(
      index,
      "Qu'a dit le dernier Conseil des ministres ?",
      "fr",
      TODAY,
    );
    expect(given.slice(0, 2).map((p) => p.id)).toEqual(["content-4:fr:0", "content-4:fr:1"]);
  });

  it("read the French pages for an English question, with its French rephrasing", () => {
    // As answerQuestion searches it: the question, then the French search it became.
    const given = retrievePassages(
      index,
      "What did the latest Council of Ministers decide? dernier Conseil des ministres décisions",
      "en",
      TODAY,
    );
    expect(given.slice(0, 2).map((p) => p.id)).toEqual(["content-4:fr:0", "content-4:fr:1"]);
    expect(searchedLanguages("en")).toEqual(["en", "fr"]);
    expect(searchedLanguages("fr")).toEqual(["fr"]);
  });

  it("bring this week's news first for a question about recent news", () => {
    const given = retrievePassages(index, "Où est allé le président cette semaine ?", "fr", TODAY);
    expect(
      given
        .slice(0, 2)
        .map((p) => p.contentId)
        .sort(),
    ).toEqual(["content-2", "content-3"]);
    expect(given.findIndex((p) => p.contentId === "content-1")).toBeGreaterThan(1);
    expect(given.length).toBeLessThanOrEqual(PASSAGES_GIVEN);
    expect(new Set(given.map((p) => p.id)).size).toBe(given.length);
  });

  it("never bring the newest articles of the base when they are about something else", () => {
    // 11/10/2026: the five newest articles crowded every news question out.
    const given = retrievePassages(index, "Où est allé le président cette semaine ?", "fr", TODAY);
    expect(given.map((p) => p.contentId)).not.toContain("content-6");
  });

  it("bring the ministry named, and the newest holder of a post first", () => {
    const interior = retrievePassages(
      index,
      "Quelles sont les dernières actualités du ministère de l'Intérieur ?",
      "fr",
      TODAY,
    );
    expect(interior[0]?.contentId).toBe("content-7");
    const prime = retrievePassages(index, "c ki le premier ministre", "fr", TODAY);
    expect(prime[0]?.contentId).toBe("content-9");
  });

  it("bring the articles of the day for the news of the day, any subject, an article once", () => {
    const given = retrievePassages(index, "Quelles sont les actualités du jour ?", "fr", TODAY);
    expect(given.map((p) => p.contentId)).toEqual(["content-6"]);
    const week = retrievePassages(index, "Qu'a fait le gouvernement cette semaine ?", "fr", TODAY);
    // Monday 5 to Thursday 8 October.
    expect(week.map((p) => p.contentId)).toEqual(["content-6", "content-3", "content-2"]);
  });

  it("bring the newest articles, with their dates, when none is of the period asked", () => {
    const given = retrievePassages(index, "Les infos d'hier", "fr", "2026-10-20");
    expect(given.map((p) => p.contentId).slice(0, 3)).toEqual([
      "content-6",
      "content-3",
      "content-2",
    ]);
    expect(given.every((p) => p.kind === "news-article")).toBe(true);
  });

  it("bring the newest news in any language for the period, the language asked first", () => {
    // Bench of 25/10/2026: the Wolof pages lag, and a Wolof question got news 17 days old.
    const wolof = (n: number, date: string): Passage => ({
      ...passage(n, date, "actualites", "Xibaar bu fictif."),
      id: `content-${String(n)}:wo:0`,
      lang: "wo",
    });
    const lagging = new PassageIndex([
      wolof(50, "2026-09-20"),
      passage(51, "2026-10-08", "actualites", "Une visite fictive."),
      wolof(51, "2026-10-08"),
      passage(52, "2026-10-07", "actualites", "Une audience fictive."),
    ]);
    const given = retrievePassages(lagging, "Lan mooy xibaar yi tey ?", "wo", TODAY);
    expect(given.map((p) => p.id)).toEqual(["content-51:wo:0"]);
    const older = retrievePassages(lagging, "Lan mooy xibaar yi tey ?", "wo", "2026-10-10");
    expect(older.map((p) => p.id)).toEqual([
      "content-51:wo:0",
      "content-52:fr:0",
      "content-50:wo:0",
    ]);
  });

  it("bring the procedure sheet first for a question asking how to do something", () => {
    // Bench of 17/10/2026: articles sharing "père" crowded out the sheet.
    const sheet: Passage = {
      ...passage(30, "2008-01-01", "", "Renonciation à succession : le procès-verbal fictif."),
      kind: "procedure",
      title: "Demander un procès-verbal de renonciation à succession",
    };
    const crowded = new PassageIndex([
      ...Array.from({ length: 60 }, (_, n) =>
        passage(100 + n, "2026-10-01", "discours", `Le père fictif ${String(n)} parle aux jeunes.`),
      ),
      sheet,
    ]);
    const question = "Je ne veux pas de la succession de mon père, comment la refuser ?";
    expect(questionIntent(question).procedure).toBe(true);
    expect(retrievePassages(crowded, question, "fr", TODAY)[0]?.contentId).toBe("content-30");
  });

  it("bring the newest composition of the government for a question about it", () => {
    // Bench of 17/10/2026: the list of September 2025 was cited, not the government of June 2026.
    const titled = (n: number, date: string, title: string, text: string): Passage => ({
      ...passage(n, date, "actualites", text),
      title,
    });
    const governments = new PassageIndex([
      titled(
        40,
        "2025-09-06",
        "Liste complète des membres du nouveau gouvernement.",
        "Ministère fictif des ministères, ministres fictifs.",
      ),
      titled(
        41,
        "2026-06-01",
        "Composition du nouveau Gouvernement",
        "Les membres fictifs du Gouvernement.",
      ),
      titled(42, "2026-06-02", "Le gouvernement fictif visite un marché", "Une visite fictive."),
    ]);
    const question = "Quels sont les ministères du gouvernement ?";
    expect(questionIntent(question).composition).toBe(true);
    expect(retrievePassages(governments, question, "fr", TODAY)[0]?.contentId).toBe("content-41");
  });

  it("give at most two pieces of a page found by the search", () => {
    const pieces = new PassageIndex(
      [0, 1, 2, 3].map((part) =>
        passage(20, "2025-01-01", "actualites", `Pêche fictive, morceau ${String(part)}.`, part),
      ),
    );
    expect(retrievePassages(pieces, "pêche fictive", "fr", TODAY)).toHaveLength(2);
  });

  it("still follow the words for any other question, newer first only when equal", () => {
    const given = retrievePassages(index, "visite officielle Paris", "fr", TODAY);
    expect(given[0]?.contentId).toBe("content-1");
    expect(retrievePassages(index, "aéroport lointain", "fr", TODAY)).toEqual([]);
  });
});
