import { isTag, type ChildNode, type Element } from "domhandler";
import render from "dom-serializer";
import { DomUtils, parseDocument } from "htmlparser2";
import { plainLetters, sanitizeArticleHtml } from "../../lib/sanitize";

/*
 * der.sn is built with the Divi page builder: a page is a run of modules (a header,
 * texts, "blurbs" with a title and a description, folding "toggles"). Its official
 * words are read from the page as published, module by module, in their order;
 * the builder's layout, images, counters and menus are left out.
 */

type ModuleKind = "header" | "text" | "blurb" | "toggle";

const MODULES: readonly (readonly [string, ModuleKind])[] = [
  ["et_pb_fullwidth_header", "header"],
  ["et_pb_text", "text"],
  ["et_pb_blurb", "blurb"],
  ["et_pb_toggle", "toggle"],
];

function classesOf(element: Element): string[] {
  return (element.attribs["class"] ?? "").split(/\s+/);
}

function kindOf(element: Element): ModuleKind | null {
  const classes = classesOf(element);
  return MODULES.find(([name]) => classes.includes(name))?.[1] ?? null;
}

function firstWithClass(root: Element, name: string): Element | null {
  return DomUtils.findOne((element) => classesOf(element).includes(name), root.children, true);
}

const BLOCK = /<(p|ul|ol|h[1-6]|blockquote)[\s>]/i;

/** A module's words; bare text (no paragraph of its own) becomes one paragraph. */
function inner(element: Element | null): string {
  if (element === null) {
    return "";
  }
  const html = render(element.children, { decodeEntities: false }).trim();
  return html === "" || BLOCK.test(html) ? html : `<p>${html}</p>`;
}

/** Paragraphs the builder wraps in paragraphs, read as one. */
function flattened(html: string): string {
  return html.replace(/<p>(\s*<p>)+/g, "<p>").replace(/<\/p>(\s*<\/p>)+/g, "</p>");
}

function textOf(element: Element | null): string {
  return element === null
    ? ""
    : plainLetters(DomUtils.textContent(element).replace(/\s+/g, " ").trim());
}

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function heading(level: 2 | 3, text: string): string {
  return text === "" ? "" : `<h${String(level)}>${escape(text)}</h${String(level)}>`;
}

/** One module's words, as plain article HTML. */
function moduleHtml(element: Element, kind: ModuleKind): string {
  switch (kind) {
    case "header":
      return heading(2, textOf(firstWithClass(element, "et_pb_fullwidth_header_subhead")));
    case "text":
      return inner(firstWithClass(element, "et_pb_text_inner"));
    case "blurb":
      return (
        heading(3, textOf(firstWithClass(element, "et_pb_module_header"))) +
        inner(firstWithClass(element, "et_pb_blurb_description"))
      );
    case "toggle":
      return (
        heading(3, textOf(firstWithClass(element, "et_pb_toggle_title"))) +
        inner(firstWithClass(element, "et_pb_toggle_content"))
      );
  }
}

/**
 * The words of a der.sn page, cleaned like an article's (sanitize.ts), or "" when
 * the page has no main content (an error page, a changed theme).
 */
export function derPageHtml(html: string): string {
  const document = parseDocument(html);
  const main = DomUtils.findOne(
    (element) => element.attribs["id"] === "main-content",
    document.children,
    true,
  );
  if (main === null) {
    return "";
  }
  const modules = DomUtils.findAll(
    (element: Element) => kindOf(element) !== null,
    main.children as ChildNode[],
  ).filter(
    // A module nested in another one is read with its parent.
    (element) => !hasModuleAncestor(element),
  );
  return flattened(
    sanitizeArticleHtml(
      modules.map((element) => moduleHtml(element, kindOf(element) ?? "text")).join(""),
    ),
  );
}

function hasModuleAncestor(element: Element): boolean {
  let parent = element.parent;
  while (parent !== null && isTag(parent)) {
    if (kindOf(parent) !== null) {
      return true;
    }
    parent = parent.parent;
  }
  return false;
}
