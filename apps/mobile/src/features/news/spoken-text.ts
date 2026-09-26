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

/**
 * What the voice reads: the title, then the text in reading order (headings,
 * paragraphs, quotes, list items). Pictures and videos are skipped. Each piece fits
 * the phone's limit for one reading.
 */
export function spokenPieces(title: string, blocks: readonly Block[], maxLength: number): string[] {
  const texts = [title];
  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "heading":
      case "quote":
        texts.push(plain(block.inlines));
        break;
      case "list":
        texts.push(...block.items.map(plain));
        break;
      case "image":
      case "video":
        break;
    }
  }
  return texts.filter((text) => text !== "").flatMap((text) => cut(text, maxLength));
}
