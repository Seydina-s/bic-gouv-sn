/*
 * Opening hours as written in OpenStreetMap ("Mo-Fr 08:00-17:00; Sa 09:00-12:00"),
 * said in plain French ("Du lundi au vendredi, de 8 h à 17 h."). Only the simple
 * forms are translated, word for word; anything else is shown as the source wrote
 * it (MAP-08: nothing is guessed).
 */

export const DAY_KEYS = ["mo", "tu", "we", "th", "fr", "sa", "su"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** The words the description needs, from the translator. */
export interface HoursWords {
  always: string;
  everyDay: string;
  dayRange: (from: string, to: string) => string;
  oneDay: (day: string) => string;
  rule: (days: string, times: string) => string;
  time: (start: string, end: string) => string;
  and: string;
  day: (key: DayKey) => string;
}

const DAYS = /^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/;
const TIME_RANGE = /^([01]\d|2[0-4]):([0-5]\d)-([01]\d|2[0-4]):([0-5]\d)$/;
const NBSP = String.fromCharCode(0xa0);

const OSM_DAYS: Readonly<Record<string, DayKey>> = {
  Mo: "mo",
  Tu: "tu",
  We: "we",
  Th: "th",
  Fr: "fr",
  Sa: "sa",
  Su: "su",
};

/** "8 h", "13 h 30": how times are said in French. */
function spoken(hours: string, minutes: string): string {
  const h = String(Number(hours));
  return minutes === "00" ? `${h}${NBSP}h` : `${h}${NBSP}h${NBSP}${minutes}`;
}

function describeTimes(raw: string, words: HoursWords): string | null {
  const ranges = raw.split(",").map((range) => TIME_RANGE.exec(range.trim()));
  if (ranges.some((range) => range === null)) {
    return null;
  }
  return ranges
    .map((range) => {
      const [, h1 = "", m1 = "", h2 = "", m2 = ""] = range ?? [];
      return words.time(spoken(h1, m1), spoken(h2, m2));
    })
    .join(` ${words.and} `);
}

function describeRule(rule: string, words: HoursWords): string | null {
  const [first = "", ...rest] = rule.trim().split(/\s+/);
  const days = DAYS.exec(first);
  if (days === null) {
    const times = rest.length === 0 ? describeTimes(first, words) : null;
    return times === null ? null : words.rule(words.everyDay, times);
  }
  const times = rest.length === 1 ? describeTimes(rest[0] ?? "", words) : null;
  if (times === null) {
    return null;
  }
  const from = OSM_DAYS[days[1] ?? ""];
  const to = days[2] === undefined ? undefined : OSM_DAYS[days[2]];
  if (from === undefined) {
    return null;
  }
  const daysText =
    to === undefined
      ? words.oneDay(words.day(from))
      : words.dayRange(words.day(from), words.day(to));
  return words.rule(daysText, times);
}

/** The hours in plain French, one sentence per rule; null when not fully understood. */
export function describeHours(raw: string, words: HoursWords): string | null {
  const text = raw.trim();
  if (text === "24/7") {
    return `${words.always}.`;
  }
  const rules = text.split(";").map((rule) => describeRule(rule, words));
  if (rules.some((rule) => rule === null)) {
    return null;
  }
  return rules.map((rule) => `${rule ?? ""}.`).join(" ");
}
