import { describeHours, type HoursWords } from "./opening-hours";

// The French words of the catalog, spelled out so the sentences read in the test.
const DAYS = {
  mo: "lundi",
  tu: "mardi",
  we: "mercredi",
  th: "jeudi",
  fr: "vendredi",
  sa: "samedi",
  su: "dimanche",
};
const words: HoursWords = {
  always: "Ouvert tous les jours, jour et nuit",
  everyDay: "Tous les jours",
  dayRange: (from, to) => `Du ${from} au ${to}`,
  oneDay: (day) => `Le ${day}`,
  rule: (days, times) => `${days}, ${times}`,
  time: (start, end) => `de ${start} à ${end}`,
  and: "et",
  day: (key) => DAYS[key],
};

/** The narrow spaces of "8 h 30" shown as plain spaces, for readable expectations. */
const said = (raw: string) => describeHours(raw, words)?.replace(/\u00a0/g, " ") ?? null;

describe("opening hours in plain French", () => {
  it.each([
    ["Mo-Fr 08:00-17:00", "Du lundi au vendredi, de 8 h à 17 h."],
    ["Su-Th 08:00-17:00", "Du dimanche au jeudi, de 8 h à 17 h."],
    ["24/7", "Ouvert tous les jours, jour et nuit."],
    ["08:30-12:30,15:30-20:00", "Tous les jours, de 8 h 30 à 12 h 30 et de 15 h 30 à 20 h."],
    [
      "Mo-Th 08:00-17:30; Fr 07:30-13:30",
      "Du lundi au jeudi, de 8 h à 17 h 30. Le vendredi, de 7 h 30 à 13 h 30.",
    ],
  ])("says « %s » as « %s »", (raw, sentence) => {
    expect(said(raw)).toBe(sentence);
  });

  it.each(["Mo,We 08:00-12:00", "sunrise-sunset", "Mo-Fr 8h-17h", "PH off"])(
    "leaves « %s » as the source wrote it",
    (raw) => {
      expect(describeHours(raw, words)).toBeNull();
    },
  );
});
