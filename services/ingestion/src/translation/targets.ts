import type { NewsArticle, Translation } from "@bgs/shared-types";
import type { OutputSize } from "./cost-estimate";
import { englishSheetSystem, englishSystem } from "./english-prompt";
import { examplePairs, frenchWithout } from "./wolof-candidates";
import { sheetSystem, translationSystem } from "./wolof-prompt";

/*
 * The languages articles are machine-translated into (owner's decisions of 09 and
 * 16/10/2026): Wolof where the Présidence gives no official Wolof version, English
 * for every article; both for every procedure sheet (ML-14). Each target says which
 * articles it takes, what the model reads before them and before a sheet, and where
 * its runs are remembered.
 */

export interface TranslationTarget {
  lang: "wo" | "en";
  /** The official French version to translate, when the article lacks this language. */
  toTranslate: (article: NewsArticle) => Translation | null;
  /** Rules (and official examples) fixed for every article of a run. */
  system: (all: readonly NewsArticle[]) => string;
  /** The document where its runs are remembered between sending and collecting. */
  state: string;
  /** Rules fixed for every procedure sheet of a run (official articles as examples). */
  sheetSystem: (articles: readonly NewsArticle[]) => string;
  /** Where the sheets' runs are remembered, apart from the articles'. */
  sheetState: string;
  /** Output size, for the cost estimate: characters per token, length against French. */
  output: OutputSize;
  /**
   * Room given to a reply, in tokens per French character: never cut short. Only the
   * tokens written are paid, the margin costs nothing.
   */
  room: number;
}

export const WOLOF: TranslationTarget = {
  lang: "wo",
  toTranslate: (article) => frenchWithout(article, "wo"),
  system: (all) => translationSystem(examplePairs(all)),
  state: "translation-runs",
  sheetSystem: (articles) => sheetSystem(examplePairs(articles)),
  sheetState: "translation-runs-sheets-wo",
  // Measured on the first run (08/10/2026): Wolof is rare to the model's words.
  output: { charactersPerToken: 1.3, lengthRatio: 1.15 },
  // 1.2 cut 147 long articles short in the large batch of 17/10/2026.
  room: 2,
};

export const ENGLISH: TranslationTarget = {
  lang: "en",
  toTranslate: (article) => frenchWithout(article, "en"),
  system: () => englishSystem(),
  state: "translation-runs-en",
  sheetSystem: () => englishSheetSystem(),
  sheetState: "translation-runs-sheets-en",
  // English is read densely and runs a little shorter than French.
  output: { charactersPerToken: 3.5, lengthRatio: 0.95 },
  room: 1.2,
};

export const TARGETS: Readonly<Record<TranslationTarget["lang"], TranslationTarget>> = {
  wo: WOLOF,
  en: ENGLISH,
};
