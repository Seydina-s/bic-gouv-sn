import type { Block, Inline } from "@bgs/shared-types";

/** "1- Connectez-vous…", "2. Cliquez…", "3) Renseignez…": a numbered step of an official guide. */
const STEP = /^\s*(\d{1,2})\s*[-–.)]\s+/;

export interface Step {
  number: number;
  /** The step's words, as written, without its number. */
  inlines: Inline[];
}

export type GuidePart = { kind: "block"; block: Block } | { kind: "steps"; steps: Step[] };

function stepOf(block: Block): Step | null {
  if (block.type !== "paragraph") {
    return null;
  }
  const [first, ...rest] = block.inlines;
  const match = first === undefined ? null : STEP.exec(first.text);
  if (first === undefined || match === null) {
    return null;
  }
  const text = first.text.slice(match[0].length);
  return {
    number: Number(match[1]),
    inlines: text === "" ? rest : [{ ...first, text }, ...rest],
  };
}

/**
 * An official page cut into its blocks and its runs of numbered steps (a guide like
 * "Comment déposer un dossier"), so steps can be laid out as steps. The words never
 * change: only the number moves into its circle.
 */
export function guideParts(blocks: readonly Block[]): GuidePart[] {
  const parts: GuidePart[] = [];
  for (const block of blocks) {
    const step = stepOf(block);
    const last = parts.at(-1);
    if (step === null) {
      parts.push({ kind: "block", block });
    } else if (last?.kind === "steps") {
      last.steps.push(step);
    } else {
      parts.push({ kind: "steps", steps: [step] });
    }
  }
  return parts;
}
