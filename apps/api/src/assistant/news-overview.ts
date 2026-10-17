/*
 * Questions about the news of a period, with no other subject ("Quelles sont les
 * actualités du jour ?", "Qu'a fait le gouvernement cette semaine ?", "What's the
 * news today?"). Their answer is not a text to find but the articles of the period:
 * searched by words, "actualité" found 2025 titles and "semaine" a health week, and
 * the assistant said it did not know (owner's report of 17/10/2026,
 * docs/cadrage/assistant-fiabilite.md). They are answered from the newest articles.
 */

export type NewsPeriod = "today" | "yesterday" | "week" | "latest";

/** Words of a question folded like the search: " lower case without accents ". */
type Folded = string;

const PERIODS: readonly [NewsPeriod, readonly string[]][] = [
  ["today", [" aujourd hui ", " du jour ", " ce jour ", " ce matin ", " today ", " tey "]],
  ["yesterday", [" hier ", " yesterday ", " demb "]],
  ["week", [" cette semaine ", " de la semaine ", " this week ", " ayu bes bii ", " semaine bii "]],
  [
    "latest",
    [
      " dernieres ",
      " derniers ",
      " derniere ",
      " dernier ",
      " recentes ",
      " recents ",
      " recemment ",
      " latest ",
      " recent ",
      " recently ",
      " yu mujj ",
    ],
  ],
];

/** Words saying the question is about the news in general. */
const NEWS = [
  " actualite ",
  " actualites ",
  " nouvelles ",
  " infos ",
  " informations ",
  " evenements ",
  " quoi de neuf ",
  " news ",
  " what s new ",
  " whats new ",
  " what happened ",
  " xibaar ",
  " xibaar yi ",
  // "Qu'a fait le gouvernement… ?": what it did is its news.
  " qu a fait ",
  " qu ont fait ",
  " what did ",
  " que s est il passe ",
  " ce qui s est passe ",
];

/**
 * Words that say nothing of a subject: question words, articles, "gouvernement",
 * "Sénégal". A question with any other word has a subject, and is searched.
 */
const GENERIC = new Set(
  (
    "quelles quels quelle quel quoi qu que c est sont sont-elles les la le l des du de d un une " +
    "en au aux et a ont il y moi me nous svp stp sil plait pour sur donne donnez dis dites " +
    "montre montrez resume resumez resumer peux pouvez tu vous principales principaux grandes " +
    "fait font faites neuf se passe passees passes " +
    "gouvernement etat senegal senegalais " +
    "the what is are s of for me tell give show any there whats new did do does happen happened " +
    "main top government senegal state " +
    "lan la ngi yi bi ci ak mooy moo am"
  ).split(" "),
);

/** The period asked, or "latest" for the news in general; null when there is a subject. */
export function newsPeriod(text: Folded): NewsPeriod | null {
  let rest = text;
  let period: NewsPeriod | null = null;
  for (const [name, cues] of PERIODS) {
    for (const cue of cues) {
      if (rest.includes(cue)) {
        rest = rest.replaceAll(cue, " ");
        period ??= name;
      }
    }
  }
  const aboutNews = NEWS.some((cue) => rest.includes(cue));
  for (const cue of NEWS) {
    rest = rest.replaceAll(cue, " ");
  }
  if (!aboutNews && period !== "today" && period !== "yesterday" && period !== "week") {
    return null;
  }
  const subject = rest.split(" ").filter((word) => word !== "" && !GENERIC.has(word));
  if (subject.length > 0) {
    return null;
  }
  return period ?? "latest";
}

const DAY_MS = 24 * 60 * 60_000;

function iso(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** The first and last days of the period (Dakar is on UTC all year); null for "latest". */
export function periodDays(period: NewsPeriod, today: string): { from: string; to: string } | null {
  const day = Date.parse(`${today}T00:00:00Z`);
  switch (period) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: iso(day - DAY_MS), to: iso(day - DAY_MS) };
    case "week": {
      const fromMonday = (new Date(day).getUTCDay() + 6) % 7;
      return { from: iso(day - fromMonday * DAY_MS), to: today };
    }
    case "latest":
      return null;
  }
}
