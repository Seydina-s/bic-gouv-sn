import { describe, expect, it } from "vitest";
import { findMissingMessages, listMessageKeys, lookupMessage } from "./catalog";
import { en } from "./messages/en";
import { fr } from "./messages/fr";
import { wo } from "./messages/wo";

const tree = { a: "A", group: { b: "B", count: { one: "1", other: "n" } } };

describe("catalog helpers", () => {
  it("lists every message key, plural messages included", () => {
    expect(listMessageKeys(tree)).toEqual(["a", "group.b", "group.count"]);
  });

  it("looks up nested messages", () => {
    expect(lookupMessage(tree, "group.b")).toBe("B");
    expect(lookupMessage(tree, "group.count")).toEqual({ one: "1", other: "n" });
  });

  it("returns undefined for groups and unknown paths", () => {
    expect(lookupMessage(tree, "group")).toBeUndefined();
    expect(lookupMessage(tree, "a.deeper")).toBeUndefined();
    expect(lookupMessage(tree, "nope")).toBeUndefined();
  });

  it("does not mistake a label group containing an 'other' key for a plural", () => {
    const labels = { group: { general: "G", other: "O" } };
    expect(listMessageKeys(labels)).toEqual(["group.general", "group.other"]);
    expect(lookupMessage(labels, "group.other")).toBe("O");
  });

  it("finds messages missing from a partial catalog", () => {
    expect(findMissingMessages(tree, { group: { b: "b" } })).toEqual(["a", "group.count"]);
  });
});

describe("shipped catalogs", () => {
  it("contain no empty French string", () => {
    for (const key of listMessageKeys(fr)) {
      const message = lookupMessage(fr, key);
      const texts =
        typeof message === "string"
          ? [message]
          : [message?.one, message?.many, message?.other].filter((text) => text !== undefined);
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.every((text) => text.trim() !== "")).toBe(true);
    }
  });

  it("follow French typography: non-breaking space before a colon and inside « »", () => {
    for (const key of listMessageKeys(fr)) {
      const message = lookupMessage(fr, key);
      const texts =
        typeof message === "string"
          ? [message]
          : [message?.one, message?.many, message?.other].filter((text) => text !== undefined);
      for (const text of texts) {
        expect(text, key).not.toMatch(/ :|« | »/);
      }
    }
  });

  // The whole app follows the language chosen (16/10/2026): a French string added
  // without its Wolof and English versions fails here.
  it.each([
    ["Wolof", wo],
    ["English", en],
  ] as const)("have every French message in %s, never empty", (_name, catalog) => {
    expect(findMissingMessages(fr, catalog)).toEqual([]);
    for (const key of listMessageKeys(fr)) {
      expect(
        textsOf(catalog, key).every((text) => text.trim() !== ""),
        key,
      ).toBe(true);
    }
  });

  it.each([
    ["Wolof", wo],
    ["English", en],
  ] as const)("keep in %s the placeholders of each French message", (_name, catalog) => {
    for (const key of listMessageKeys(fr)) {
      // Plural forms together: "Voir l'article" has no count, its plural has one.
      expect(placeholdersOf(textsOf(catalog, key)), key).toEqual(placeholdersOf(textsOf(fr, key)));
    }
  });

  it("write English without the French space before a colon or a question mark", () => {
    for (const key of listMessageKeys(fr)) {
      for (const text of textsOf(en, key)) {
        expect(text, key).not.toMatch(/\s[:?!]/u);
      }
    }
  });
});

/** Every form of a message (one text, or its plural forms). */
function textsOf(catalog: object, key: string): string[] {
  const message = lookupMessage(catalog, key);
  return typeof message === "string"
    ? [message]
    : [message?.one, message?.many, message?.other].filter((text) => text !== undefined);
}

/** The placeholders a message uses ("{count}"), sorted, without duplicates. */
function placeholdersOf(texts: readonly string[]): string[] {
  return [...new Set(texts.flatMap((text) => text.match(/\{\w+\}/g) ?? []))].sort();
}
