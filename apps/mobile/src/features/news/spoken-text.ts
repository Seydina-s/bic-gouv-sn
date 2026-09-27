import type { Block, Inline } from "@bgs/shared-types";

function plain(inlines: readonly Inline[]): string {
  return inlines
    .map((run) => run.text)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** A text too long for one reading, cut after sentences (or words, as a last resort). */
function cut(text: string, maxLength: number): string[] {
  const pieces: string[] = [];
  let rest = text;
  while (rest.length > maxLength) {
    const window = rest.slice(0, maxLength);
    const sentenceEnd = Math.max(
      window.lastIndexOf(". "),
      window.lastIndexOf("! "),
      window.lastIndexOf("? "),
    );
    const at = sentenceEnd > 0 ? sentenceEnd + 1 : Math.max(window.lastIndexOf(" "), 1);
    pieces.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  return rest === "" ? pieces : [...pieces, rest];
}

/** Texts in reading order, empty ones left out, each cut to fit one reading. */
export function spokenTexts(texts: readonly string[], maxLength: number): string[] {
  return texts.filter((text) => text !== "").flatMap((text) => cut(text, maxLength));
}

/** What a block says aloud: its text, each list item apart; nothing for pictures. */
export function blockTexts(block: Block): string[] {
  switch (block.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return [plain(block.inlines)];
    case "list":
      return block.items.map(plain);
    case "image":
    case "video":
      return [];
  }
}

/**
 * What the voice reads: the title, then the text in reading order (headings,
 * paragraphs, quotes, list items). Pictures and videos are skipped. Each piece fits
 * the phone's limit for one reading.
 */
export function spokenPieces(title: string, blocks: readonly Block[], maxLength: number): string[] {
  return spokenTexts([title, ...blocks.flatMap(blockTexts)], maxLength);
}
