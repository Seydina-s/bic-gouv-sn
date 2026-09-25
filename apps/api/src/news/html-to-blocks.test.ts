import { describe, expect, it } from "vitest";
import { excerptOf, htmlToBlocks } from "./html-to-blocks";

describe("htmlToBlocks", () => {
  it("turns paragraphs into blocks with trimmed text", () => {
    expect(htmlToBlocks("<p>  Bonjour   le  monde </p>")).toEqual([
      { type: "paragraph", inlines: [{ text: "Bonjour le monde" }] },
    ]);
  });

  it("keeps bold, italic, underline and HTTPS links as marks, merging identical runs", () => {
    expect(
      htmlToBlocks(
        '<p>a <strong>b</strong><strong>c</strong> <em>d</em> <u>e</u> <a href="https://x.test">f</a></p>',
      ),
    ).toEqual([
      {
        type: "paragraph",
        inlines: [
          { text: "a " },
          { text: "bc", bold: true },
          { text: " " },
          { text: "d", italic: true },
          { text: " " },
          { text: "e", underline: true },
          { text: " " },
          { text: "f", href: "https://x.test" },
        ],
      },
    ]);
  });

  it("drops links that are not HTTPS but keeps their text", () => {
    expect(htmlToBlocks("<p><a>texte</a></p>")).toEqual([
      { type: "paragraph", inlines: [{ text: "texte" }] },
    ]);
  });

  it("turns line breaks into new lines", () => {
    expect(htmlToBlocks("<p>Un<br />Deux</p>")).toEqual([
      { type: "paragraph", inlines: [{ text: "Un\nDeux" }] },
    ]);
  });

  it("extracts images from paragraphs and fixes double slashes of the source", () => {
    expect(
      htmlToBlocks(
        '<p><img src="https://bo-admin.presidence.sn//storage/a.jpg" alt="Photo" />Texte</p>',
      ),
    ).toEqual([
      { type: "image", src: "https://bo-admin.presidence.sn/storage/a.jpg", alt: "Photo" },
      { type: "paragraph", inlines: [{ text: "Texte" }] },
    ]);
  });

  it("ignores images without an HTTPS source and uses null for a missing alt", () => {
    expect(
      htmlToBlocks('<img src="http://a.test/x.jpg" /><img src="https://a.test/y.jpg" />'),
    ).toEqual([{ type: "image", src: "https://a.test/y.jpg", alt: null }]);
  });

  it("handles headings, lists, quotes and loose text", () => {
    expect(
      htmlToBlocks(
        "<h3>Titre</h3><ol><li>Un</li><li> </li></ol><ul></ul><blockquote>Citation</blockquote>Libre",
      ),
    ).toEqual([
      { type: "heading", level: 3, inlines: [{ text: "Titre" }] },
      { type: "list", ordered: true, items: [[{ text: "Un" }]] },
      { type: "quote", inlines: [{ text: "Citation" }] },
      { type: "paragraph", inlines: [{ text: "Libre" }] },
    ]);
  });

  it("ignores comments and empty paragraphs", () => {
    expect(htmlToBlocks("<!-- note --><p> </p>")).toEqual([]);
  });
});

describe("excerptOf", () => {
  it("returns the first paragraph when short", () => {
    expect(excerptOf(htmlToBlocks('<img src="https://a.test/i.jpg" /><p>Court.</p>'))).toBe(
      "Court.",
    );
  });

  it("cuts long text on a word boundary", () => {
    const blocks = htmlToBlocks(`<p>${"mot ".repeat(60)}</p>`);
    const excerpt = excerptOf(blocks, 30);
    expect(excerpt).toBe("mot mot mot mot mot mot mot…");
  });

  it("is empty without paragraph", () => {
    expect(excerptOf([])).toBe("");
  });
});
