import { z } from "zod";

/*
 * Rich text of interieur.gouv.sn (Strapi "blocks"): paragraphs, headings, lists,
 * quotes, links and images, as structured data. Turned into the HTML our common
 * sanitization reads; the words are copied, never rewritten.
 */

const textSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
});

type Text = z.infer<typeof textSchema>;
interface Link {
  type: "link";
  url: string;
  children: Inline[];
}
type Inline = Text | Link;

const inlineSchema: z.ZodType<Inline> = z.lazy(() =>
  z.union([
    textSchema,
    z.object({ type: z.literal("link"), url: z.string(), children: z.array(inlineSchema) }),
  ]),
);

export const blockSchema = z.object({
  type: z.string(),
  level: z.int().optional(),
  format: z.string().optional(),
  image: z.object({ url: z.string() }).optional(),
  children: z.array(z.unknown()).optional(),
});
export type StrapiBlock = z.infer<typeof blockSchema>;

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function inlines(children: readonly unknown[]): string {
  return children
    .map((child) => {
      const parsed = inlineSchema.safeParse(child);
      if (!parsed.success) {
        return "";
      }
      const inline = parsed.data;
      if (inline.type === "link") {
        return `<a href="${escape(inline.url)}">${inlines(inline.children)}</a>`;
      }
      let html = escape(inline.text).replaceAll("\n", "<br />");
      html = inline.bold === true ? `<strong>${html}</strong>` : html;
      html = inline.italic === true ? `<em>${html}</em>` : html;
      return inline.underline === true ? `<u>${html}</u>` : html;
    })
    .join("");
}

function listItems(children: readonly unknown[]): string {
  return children
    .map((child) => blockSchema.safeParse(child))
    .filter((parsed) => parsed.success && parsed.data.type === "list-item")
    .map((parsed) => `<li>${inlines(parsed.data?.children ?? [])}</li>`)
    .join("");
}

/** One block as HTML; an unknown kind of block is left out. */
function block(raw: unknown, absolute: (path: string) => string): string {
  const parsed = blockSchema.safeParse(raw);
  if (!parsed.success) {
    return "";
  }
  const { type, level, format, image, children = [] } = parsed.data;
  switch (type) {
    case "paragraph":
      return `<p>${inlines(children)}</p>`;
    case "heading": {
      const tag = `h${String(Math.min(Math.max(level ?? 2, 2), 4))}`;
      return `<${tag}>${inlines(children)}</${tag}>`;
    }
    case "list":
      return format === "ordered"
        ? `<ol>${listItems(children)}</ol>`
        : `<ul>${listItems(children)}</ul>`;
    case "quote":
      return `<blockquote>${inlines(children)}</blockquote>`;
    case "image":
      return image === undefined
        ? ""
        : `<p><img src="${escape(absolute(image.url))}" alt="" /></p>`;
    default:
      return "";
  }
}

export function blocksToHtml(
  blocks: readonly unknown[],
  absolute: (path: string) => string,
): string {
  return blocks.map((raw) => block(raw, absolute)).join("");
}
