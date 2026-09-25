import type { Block, Inline } from "@bgs/shared-types";
import { isTag, isText, type ChildNode, type Element } from "domhandler";
import { parseDocument } from "htmlparser2";

/*
 * Converts the sanitized article HTML (allowlist in services/ingestion) into
 * structured blocks the app renders natively. Unknown tags are read as text.
 */

type Marks = Pick<Inline, "bold" | "italic" | "underline" | "href">;

const MARK_OF_TAG: Record<string, Marks> = {
  strong: { bold: true },
  em: { italic: true },
  u: { underline: true },
};

function marksFor(element: Element, marks: Marks): Marks {
  if (element.name === "a") {
    const href = element.attribs["href"];
    return href?.startsWith("https://") === true ? { ...marks, href } : marks;
  }
  return { ...marks, ...MARK_OF_TAG[element.name] };
}

function collectInlines(nodes: ChildNode[], marks: Marks, out: Inline[]): void {
  for (const node of nodes) {
    if (isText(node)) {
      out.push({ text: node.data.replace(/\s+/g, " "), ...marks });
    } else if (isTag(node) && node.name === "br") {
      out.push({ text: "\n", ...marks });
    } else if (isTag(node) && node.name !== "img") {
      collectInlines(node.children, marksFor(node, marks), out);
    }
  }
}

function sameMarks(a: Inline, b: Inline): boolean {
  return (
    a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.href === b.href
  );
}

/** Inline runs of a node list: merged when formatting is identical, trimmed at the edges. */
function inlinesOf(nodes: ChildNode[]): Inline[] {
  const raw: Inline[] = [];
  collectInlines(nodes, {}, raw);
  const merged: Inline[] = [];
  for (const run of raw) {
    const previous = merged.at(-1);
    if (previous !== undefined && sameMarks(previous, run)) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  const first = merged.at(0);
  const last = merged.at(-1);
  if (first !== undefined) first.text = first.text.trimStart();
  if (last !== undefined) last.text = last.text.trimEnd();
  return merged.filter((run) => run.text !== "");
}

/** An empty or missing alt text is stored as null (no description available). */
function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

function imageBlock(element: Element): Block[] {
  const src = element.attribs["src"];
  if (src?.startsWith("https://") !== true) {
    return [];
  }
  return [
    {
      type: "image",
      src: src.replace(/([^:])\/{2,}/g, "$1/"),
      alt: nonEmpty(element.attribs["alt"]),
    },
  ];
}

/** Images nested in a paragraph become their own blocks, around the text. */
function textBlock(element: Element, make: (inlines: Inline[]) => Block): Block[] {
  const images = element.children.filter(
    (child): child is Element => isTag(child) && child.name === "img",
  );
  const inlines = inlinesOf(element.children);
  return [...images.flatMap(imageBlock), ...(inlines.length > 0 ? [make(inlines)] : [])];
}

function listBlock(element: Element): Block[] {
  const items = element.children
    .filter((child): child is Element => isTag(child) && child.name === "li")
    .map((item) => inlinesOf(item.children))
    .filter((item) => item.length > 0);
  return items.length > 0 ? [{ type: "list", ordered: element.name === "ol", items }] : [];
}

function blocksOf(node: ChildNode): Block[] {
  if (isText(node)) {
    const inlines = inlinesOf([node]);
    return inlines.length > 0 ? [{ type: "paragraph", inlines }] : [];
  }
  if (!isTag(node)) {
    return [];
  }
  switch (node.name) {
    case "img":
      return imageBlock(node);
    case "h2":
    case "h3":
    case "h4": {
      const level = Number(node.name.slice(1)) as 2 | 3 | 4;
      return textBlock(node, (inlines) => ({ type: "heading", level, inlines }));
    }
    case "ul":
    case "ol":
      return listBlock(node);
    case "blockquote":
      return textBlock(node, (inlines) => ({ type: "quote", inlines }));
    default:
      return textBlock(node, (inlines) => ({ type: "paragraph", inlines }));
  }
}

export function htmlToBlocks(html: string): Block[] {
  return parseDocument(html).children.flatMap(blocksOf);
}

/** Opening words of the article, cut on a word boundary. Never rewritten. */
export function excerptOf(blocks: Block[], maxLength = 180): string {
  const paragraph = blocks.find((block) => block.type === "paragraph");
  const text =
    paragraph?.inlines
      .map((run) => run.text)
      .join("")
      .replace(/\s+/g, " ")
      .trim() ?? "";
  if (text.length <= maxLength) {
    return text;
  }
  const cut = text.slice(0, maxLength);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)).trimEnd()}…`;
}
