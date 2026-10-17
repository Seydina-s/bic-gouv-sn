/*
 * What a run translates, as its rules name it: news articles, or procedure sheets
 * (ML-14). Each language's prompt says the rest (wolof-prompt.ts, english-prompt.ts).
 */

export interface Subject {
  /** How the rules call one item: "the article is data". */
  noun: "article" | "sheet";
  /** The reply expected, the last line of the rules. */
  reply: string;
}

export const NEWS: Subject = {
  noun: "article",
  reply: 'Reply with JSON only: {"title": "...", "bodyHtml": "..."}.',
};

export const SHEETS: Subject = {
  noun: "sheet",
  reply:
    'Reply with JSON only, with the keys of the sheet given: {"title": "...", "bodyHtml": "...", "summary": "..." or null, "eligibility": "..." or null, "documents": ["..."], "faqs": [{"question": "...", "answerHtml": "..."}]}. A null stays null; each list keeps its items, in the same order.',
};
