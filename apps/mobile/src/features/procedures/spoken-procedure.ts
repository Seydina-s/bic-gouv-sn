import type { Inline } from "@bgs/shared-types";
import { blockTexts, spokenTexts } from "../news/spoken-text";
import type { BriefFact, ProcedurePage } from "./procedure-page";
import type { SheetItem } from "./procedure-sheet";

/** The words the voice adds to the page's own: the panel's labels, "Remarque". */
export interface SpokenWords {
  brief: string;
  fact: (fact: BriefFact) => string;
  note: string;
}

function plain(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function itemTexts(item: SheetItem, words: SpokenWords): string[] {
  switch (item.type) {
    case "text":
      return [plain(item.inlines)];
    case "note":
      return [`${words.note} : ${plain(item.inlines)}`];
    case "list":
      return item.items.map(plain);
    case "block":
      return blockTexts(item.block);
  }
}

/**
 * What the voice reads on a procedure page, in the page's own order: the title, the
 * lead, the brief ("Coût : Gratuit"), then each question of the sheet and its answer.
 * Each piece fits the phone's limit for one reading.
 */
export function spokenProcedure(
  title: string,
  page: ProcedurePage,
  words: SpokenWords,
  maxLength: number,
): string[] {
  return spokenTexts(
    [
      title,
      page.lead === null ? "" : plain(page.lead),
      ...(page.facts.length > 0 ? [words.brief, ...page.facts.map(words.fact)] : []),
      ...page.intro.flatMap((item) => itemTexts(item, words)),
      ...page.sections.flatMap((section) => [
        section.title,
        ...section.items.flatMap((item) => itemTexts(item, words)),
      ]),
    ],
    maxLength,
  );
}
