/*
 * Courtesy messages answered on the phone, without asking the assistant (owner's
 * report of 11/10/2026: "Bonjour", "Merci" and "Qui es-tu ?" were answered "outside
 * my subjects"). Only a message made of courtesy alone is answered here: "Bonjour,
 * comment avoir un passeport ?" goes to the assistant. French and Wolof, as people
 * write them (salamalekoum, nanga def, dieuredieuf…).
 */

export type SmallTalk = "greeting" | "thanks" | "identity";

const PHRASES: Readonly<Record<SmallTalk, readonly string[]>> = {
  greeting: [
    "bonjour",
    "bonsoir",
    "salut",
    "slt",
    "coucou",
    "hello",
    "salam",
    "salaam",
    "salamalekoum",
    "salamaleykoum",
    "salam aleykoum",
    "salam alaykoum",
    "assalamou aleykoum",
    "assalamu alaykum",
    "asalaa maalekum",
    "salaa maalekum",
    "nanga def",
    "na nga def",
    "nangadef",
    "nanguen def",
    "naka nga def",
    "ca va",
    "comment allez vous",
    "comment vas tu",
  ],
  thanks: [
    "merci",
    "mrc",
    "merci beaucoup",
    "merci bien",
    "jerejef",
    "jerre jef",
    "jerejeff",
    "dieuredieuf",
    "djeuredieuf",
    "diaredief",
    "jerejef waay",
    "ok merci",
  ],
  identity: [
    "qui es tu",
    "tu es qui",
    "t es qui",
    "qui etes vous",
    "vous etes qui",
    "que peux tu faire",
    "que pouvez vous faire",
    "tu fais quoi",
    "a quoi tu sers",
    "a quoi servez vous",
    "comment tu marches",
    "kan nga",
    "yaw kan nga",
    "kan ngeen",
  ],
};

/** Words that may surround a courtesy without making it a question. */
const FILLERS = new Set([
  "monsieur",
  "madame",
  "svp",
  "stp",
  "s",
  "il",
  "vous",
  "te",
  "plait",
  "bien",
  "a",
  "toi",
  "encore",
  "beaucoup",
  "pour",
  "moi",
]);

function folded(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** What kind of courtesy the message is, or null when it asks something else. */
export function smallTalkOf(message: string): SmallTalk | null {
  let rest = ` ${folded(message)} `;
  const found: SmallTalk[] = [];
  // Longest phrases first: "merci beaucoup" before "merci".
  const phrases = (Object.keys(PHRASES) as SmallTalk[])
    .flatMap((kind) => PHRASES[kind].map((phrase) => ({ kind, phrase })))
    .sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { kind, phrase } of phrases) {
    if (rest.includes(` ${phrase} `)) {
      rest = rest.replace(` ${phrase} `, " ");
      found.push(kind);
    }
  }
  const leftover = rest.split(" ").filter((word) => word !== "" && !FILLERS.has(word));
  if (found.length === 0 || leftover.length > 0) {
    return null;
  }
  // "Bonjour, qui êtes-vous ?" is answered with who the assistant is.
  return found.includes("identity") ? "identity" : (found.at(-1) ?? null);
}
