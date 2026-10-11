import { FRENCH_LEXICON, type Reading } from "./french-lexicon";

/*
 * What our French voice says for a text (owner's decision of 10/10/2026): titles and
 * abbreviations written out, words in capitals read as words, acronyms spelled, and
 * the readings of the lexicon (french-lexicon.ts: validated by listening). Only what
 * is said changes: the app shows the source's text as published.
 */

const ABBREVIATIONS: readonly (readonly [RegExp, string])[] = [
  [/(?<![\p{L}.])S\.\s?E\.\s?M\.(?=\s)/gu, "Son Excellence Monsieur"],
  [/(?<![\p{L}.])S\.\s?E\.(?=\s)/gu, "Son Excellence"],
  [/(?<!\p{L})MM\.(?=\s)/gu, "Messieurs"],
  [/(?<!\p{L})M\.(?=\s+\p{Lu})/gu, "Monsieur"],
  [/(?<!\p{L})Mmes(?=\s)/gu, "Mesdames"],
  [/(?<!\p{L})Mme(?=\s)/gu, "Madame"],
  [/(?<!\p{L})Dr\.?(?=\s+\p{Lu})/gu, "Docteur"],
  [/(?<!\p{L})Pr\.?(?=\s+\p{Lu})/gu, "Professeur"],
  [/(?<!\p{L})Me(?=\s+\p{Lu})/gu, "Maître"],
  [/(?<!\p{L})Mgr\.?(?=\s)/gu, "Monseigneur"],
  [/(?<!\p{L})[nN]°\s?/gu, "numéro "],
  [/(?<!\p{L})etc\./gu, "et cetera"],
  [/(?<!\p{L})cf\./gu, "confer"],
  [/(?<!\p{L})Hon\.(?=\s)/gu, "Honorable"],
];

/**
 * In one pass, so that a reading is never read again: a word in capitals (two letters
 * at least, group 1), or a word written with a capital (group 2).
 */
const WORDS = /(?<![\p{L}\d])(?:(\p{Lu}{2,}(?:-\p{Lu}{2,})*)|(\p{Lu}\p{Ll}+))(?![\p{L}\d])/gu;

/** "Sène" → "SENE": the key of the lexicon. */
export function lexiconKey(word: string): string {
  return word.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
}

function spelled(word: string): string {
  return word.replace(/-/g, "").replace(/(?<=\p{L})(?=\p{L})/gu, "-");
}

function said(word: string, reading: Reading): string {
  if ("phonemes" in reading) {
    return `[${word}](/${reading.phonemes}/)`;
  }
  return "spell" in reading ? spelled(word) : reading.say;
}

/**
 * A word in capitals the lexicon does not know. Titles in capitals are far more common
 * than rare acronyms: it is read as a word, in small letters, unless it is too short
 * or has too few vowels to be one (then spelled).
 */
function unknownCapitals(word: string): string {
  const letters = lexiconKey(word).replace(/-/g, "");
  const vowels = letters.replace(/[^AEIOUY]/g, "").length;
  const spellIt = letters.length <= 3 || vowels / letters.length <= 0.25;
  return spellIt ? spelled(word) : word.toLowerCase();
}

export function readAloudFrench(text: string, lexicon = FRENCH_LEXICON): string {
  let spoken = text;
  for (const [pattern, replacement] of ABBREVIATIONS) {
    spoken = spoken.replace(pattern, replacement);
  }
  return spoken.replace(WORDS, (word: string, capitals: string | undefined) => {
    const key = lexiconKey(word);
    if (capitals === undefined) {
      const name = lexicon.names[key];
      return name === undefined ? word : said(word, name);
    }
    const reading = lexicon.capitals[key] ?? lexicon.names[key];
    return reading === undefined ? unknownCapitals(word) : said(word, reading);
  });
}
